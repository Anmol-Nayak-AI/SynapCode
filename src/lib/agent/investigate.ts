import { calculateImpact } from "@/lib/graph/analysis";
import type { GraphSnapshot } from "@/types/graph";

export interface Investigation {
  answer: string;
  evidence: string[];
  mode: "deterministic" | "openai";
  status: "verified" | "insufficient_evidence";
  traceId?: string;
}

export function investigateLocally(question: string, snapshot: GraphSnapshot): Investigation {
  const q = question.toLowerCase();
  const coverageNote = snapshot.truncated ? " This snapshot was truncated by ingestion limits, so modules outside the captured graph may be missing." : "";
  if (/\b(circular|cycle|cycles)\b/.test(q)) {
    const cyclePaths = [...new Set(snapshot.cycles.flat().map((id) => snapshot.modules.find((module) => module.id === id)?.path).filter((path): path is string => Boolean(path)))];
    return {
      answer: snapshot.cycles.length
        ? `The verified graph contains ${snapshot.cycles.length} circular dependency chain${snapshot.cycles.length === 1 ? "" : "s"}. The involved modules are listed as evidence.${coverageNote}`
        : `No circular dependency chains were found in the current verified graph snapshot.${coverageNote}`,
      evidence: cyclePaths,
      mode: "deterministic",
      status: "verified",
    };
  }
  const requestedPaths = question.match(/\b(?:[\w@.-]+\/)+[\w@.-]+\.[a-z0-9]+\b/gi) ?? [];
  const pathTarget = snapshot.modules.find((module) => q.includes(module.path.toLowerCase()));
  if (requestedPaths.length > 0 && !pathTarget) {
    return {
      answer: `I cannot verify an impact for ${requestedPaths[0]} because that path is not present in the current ${snapshot.repository}@${snapshot.commit} snapshot. I did not substitute a different module.${coverageNote}`,
      evidence: [],
      mode: "deterministic",
      status: "insufficient_evidence",
    };
  }

  const namedTarget = snapshot.modules.find((module) => q.includes(module.label.toLowerCase()));
  const widestImpactTarget = /\b(widest|broadest|largest|most impact|highest impact)\b/.test(q)
    ? [...snapshot.modules].sort((a, b) => calculateImpact(b.id, snapshot.edges).affected.length - calculateImpact(a.id, snapshot.edges).affected.length)[0]
    : undefined;
  const target = pathTarget ?? namedTarget ?? widestImpactTarget;
  if (!target) {
    return {
      answer: `I could not identify a module in that question from the current ${snapshot.repository}@${snapshot.commit} snapshot. Select a module or use an exact listed path so I can calculate its verified dependency impact.${coverageNote}`,
      evidence: [],
      mode: "deterministic",
      status: "insufficient_evidence",
    };
  }
  const impact = calculateImpact(target.id, snapshot.edges);
  const affected = impact.affected.map((id) => snapshot.modules.find((module) => module.id === id)?.path).filter((path): path is string => Boolean(path));
  return {
    answer: `I traced ${target.path} through the verified import graph. It is directly or transitively consumed by ${impact.affected.length} module${impact.affected.length === 1 ? "" : "s"}, giving this change a ${impact.risk} blast-radius rating.${affected.length ? ` The affected paths include ${affected.slice(0, 4).join(", ")}.` : " No upstream consumers were found."} ${snapshot.cycles.length ? `I also found ${snapshot.cycles.length} circular dependency chain(s) worth isolating before this change.` : "No circular dependency is involved."}${coverageNote}`,
    evidence: [target.path, ...affected.slice(0, 4)],
    mode: "deterministic",
    status: "verified",
  };
}

export function validateEvidence(snapshot: GraphSnapshot, evidence: string[]) {
  const paths = new Set(snapshot.modules.map((module) => module.path));
  const invalid = evidence.filter((path) => !paths.has(path));
  return { valid: invalid.length === 0, invalid };
}
