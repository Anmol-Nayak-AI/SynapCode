import { describe, expect, it } from "vitest";
import { calculateImpact, findCycles } from "@/lib/graph/analysis";
import type { DependencyEdge } from "@/types/graph";

const edges: DependencyEdge[] = [
  { id: "1", source: "page", target: "feature", type: "static" },
  { id: "2", source: "feature", target: "api", type: "static" },
  { id: "3", source: "admin", target: "api", type: "dynamic" },
];

describe("graph analysis", () => {
  it("walks reverse dependencies and reports change risk", () => {
    expect(calculateImpact("api", edges)).toMatchObject({
      affected: expect.arrayContaining(["feature", "page", "admin"]),
      risk: "medium",
    });
  });

  it("detects unique circular dependency paths", () => {
    const cycleEdges: DependencyEdge[] = [
      { id: "1", source: "a", target: "b", type: "static" },
      { id: "2", source: "b", target: "c", type: "static" },
      { id: "3", source: "c", target: "a", type: "static" },
    ];
    expect(findCycles(["a", "b", "c"], cycleEdges)).toHaveLength(1);
    expect(findCycles(["a", "b", "c"], cycleEdges)[0]).toEqual(["a", "b", "c", "a"]);
  });
});
