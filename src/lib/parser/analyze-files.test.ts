import { describe, expect, it } from "vitest";
import { analyzeFiles } from "@/lib/parser/analyze-files";

describe("analyzeFiles", () => {
  it("extracts static and dynamic relative imports", () => {
    const snapshot = analyzeFiles([
      { path: "src/page.tsx", content: "import api from './lib/api'; export const Page = () => api();" },
      { path: "src/lib/api.ts", content: "export default () => import('./config');" },
      { path: "src/lib/config.ts", content: "export const value = 1;" },
    ]);
    expect(snapshot.modules).toHaveLength(3);
    expect(snapshot.edges).toHaveLength(2);
    expect(snapshot.edges.map((edge) => edge.type)).toEqual(["static", "dynamic"]);
    expect(snapshot.cycles).toHaveLength(0);
  });

  it("reports cycles discovered by the AST graph", () => {
    const snapshot = analyzeFiles([
      { path: "a.ts", content: "import './b';" },
      { path: "b.ts", content: "import './a';" },
    ]);
    expect(snapshot.cycles).toHaveLength(1);
    expect(snapshot.healthScore).toBeLessThan(100);
  });

  it("resolves common source aliases, re-exports, and require calls", () => {
    const snapshot = analyzeFiles([
      { path: "src/app/page.tsx", content: "import Button from '@/components/button'; export { api } from '@/lib/api';" },
      { path: "src/components/button/index.tsx", content: "export default function Button() { return null; }" },
      { path: "src/lib/api.ts", content: "export const api = require('./transport');" },
      { path: "src/lib/transport.ts", content: "export const transport = true;" },
    ]);

    expect(snapshot.edges).toHaveLength(3);
    const paths = new Map(snapshot.modules.map((module) => [module.id, module.path]));
    expect(snapshot.edges.map((edge) => [paths.get(edge.source), paths.get(edge.target)])).toEqual([
      ["src/app/page.tsx", "src/components/button/index.tsx"],
      ["src/app/page.tsx", "src/lib/api.ts"],
      ["src/lib/api.ts", "src/lib/transport.ts"],
    ]);
  });
});
