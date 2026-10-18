import type { DependencyEdge, ImpactResult, RiskLevel } from "@/types/graph";

export function findCycles(nodeIds: string[], edges: DependencyEdge[]): string[][] {
  const adjacency = new Map(nodeIds.map((id) => [id, [] as string[]]));
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  function visit(node: string) {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) cycles.push([...stack.slice(start), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    active.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) visit(next);
    stack.pop();
    active.delete(node);
  }

  nodeIds.forEach(visit);
  return dedupeCycles(cycles);
}

function dedupeCycles(cycles: string[][]) {
  const seen = new Set<string>();
  return cycles.filter((cycle) => {
    const body = cycle.slice(0, -1);
    const rotations = body.map((_, index) => [...body.slice(index), ...body.slice(0, index)].join("→"));
    const key = rotations.sort()[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateImpact(sourceId: string, edges: DependencyEdge[]): ImpactResult {
  const reverse = new Map<string, string[]>();
  for (const edge of edges) reverse.set(edge.target, [...(reverse.get(edge.target) ?? []), edge.source]);

  const affected = new Set<string>();
  const paths: string[][] = [];
  const queue: string[][] = [[sourceId]];
  while (queue.length) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    for (const consumer of reverse.get(current) ?? []) {
      if (path.includes(consumer)) continue;
      const nextPath = [...path, consumer];
      paths.push(nextPath);
      if (!affected.has(consumer)) {
        affected.add(consumer);
        queue.push(nextPath);
      }
    }
  }

  const count = affected.size;
  const risk: RiskLevel = count >= 8 ? "critical" : count >= 5 ? "high" : count >= 2 ? "medium" : "low";
  return { sourceId, affected: [...affected], paths, risk };
}

export function calculateHealthScore(moduleCount: number, edgeCount: number, cycleCount: number) {
  if (!moduleCount) return 100;
  const densityPenalty = Math.max(0, edgeCount / moduleCount - 2) * 4;
  const cyclePenalty = Math.min(60, cycleCount * 12);
  return Math.max(0, Math.round(100 - densityPenalty - cyclePenalty));
}
