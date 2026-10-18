import path from "node:path";
import { Project, SyntaxKind } from "ts-morph";
import { calculateHealthScore, findCycles } from "@/lib/graph/analysis";
import type { CodeModule, DependencyEdge, GraphSnapshot, ModuleKind } from "@/types/graph";

export interface SourceInput { path: string; content: string }

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function normalize(filePath: string) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function kindFor(filePath: string): ModuleKind {
  const lower = filePath.toLowerCase();
  if (/\.(test|spec)\.[jt]sx?$/.test(lower)) return "test";
  if (/(^|\/)(page|layout)\.tsx$/.test(lower)) return "page";
  if (lower.includes("/hooks/") || /\/use-[^/]+\.[jt]s/.test(lower)) return "hook";
  if (lower.includes("/components/") || lower.endsWith(".tsx")) return "component";
  if (lower.includes("/services/") || lower.includes("/api/")) return "service";
  if (lower.includes("config") || lower.includes("env")) return "config";
  return "utility";
}

function resolveSpecifier(from: string, specifier: string, known: Set<string>) {
  const bases = specifier.startsWith(".")
    ? [normalize(path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier)))]
    : specifier.startsWith("@/") || specifier.startsWith("~/")
      ? [`src/${specifier.slice(2)}`, specifier.slice(2)]
      : specifier.startsWith("src/") ? [specifier] : [];
  const candidates = bases.flatMap((base) => [base, ...EXTENSIONS.map((ext) => base + ext), ...EXTENSIONS.map((ext) => `${base}/index${ext}`)]);
  return candidates.find((candidate) => known.has(candidate));
}

export function analyzeFiles(files: SourceInput[], meta?: Partial<Pick<GraphSnapshot, "repository" | "branch" | "commit">>): GraphSnapshot {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 4 } });
  const normalizedFiles = files.map((file) => ({ ...file, path: normalize(file.path) }));
  const known = new Set(normalizedFiles.map((file) => file.path));
  const idByPath = new Map(normalizedFiles.map((file, index) => [file.path, `m${index + 1}`]));
  normalizedFiles.forEach((file) => project.createSourceFile(file.path, file.content, { overwrite: true }));

  const edges: DependencyEdge[] = [];
  for (const sourceFile of project.getSourceFiles()) {
    const sourcePath = normalize(sourceFile.getFilePath().replace(/^\//, ""));
    const sourceId = idByPath.get(sourcePath);
    if (!sourceId) continue;
    const imports = [
      ...sourceFile.getImportDeclarations().map((node) => ({ value: node.getModuleSpecifierValue(), dynamic: false })),
      ...sourceFile.getExportDeclarations().flatMap((node) => {
        const value = node.getModuleSpecifierValue();
        return value ? [{ value, dynamic: false }] : [];
      }),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter((node) => ["import", "require"].includes(node.getExpression().getText()))
        .map((node) => ({ value: node.getArguments()[0]?.getText().replace(/^['\"]|['\"]$/g, "") ?? "", dynamic: node.getExpression().getText() === "import" })),
    ];
    for (const item of imports) {
      const targetPath = resolveSpecifier(sourcePath, item.value, known);
      const targetId = targetPath ? idByPath.get(targetPath) : undefined;
      if (targetId && !edges.some((edge) => edge.source === sourceId && edge.target === targetId)) {
        edges.push({ id: `e${edges.length + 1}`, source: sourceId, target: targetId, type: item.dynamic ? "dynamic" : "static" });
      }
    }
  }

  const modules: CodeModule[] = normalizedFiles.map((file) => {
    const id = idByPath.get(file.path)!;
    return {
      id,
      path: file.path,
      label: path.posix.basename(file.path).replace(/\.[^.]+$/, ""),
      kind: kindFor(file.path),
      imports: edges.filter((edge) => edge.source === id).length,
      importedBy: edges.filter((edge) => edge.target === id).length,
      loc: file.content.split("\n").length,
    };
  });
  const cycles = findCycles(modules.map((module) => module.id), edges);

  return {
    repository: meta?.repository ?? "uploaded/source",
    branch: meta?.branch ?? "main",
    commit: meta?.commit ?? "local",
    analyzedAt: new Date().toISOString(),
    modules,
    edges,
    cycles,
    healthScore: calculateHealthScore(modules.length, edges.length, cycles.length),
  };
}
