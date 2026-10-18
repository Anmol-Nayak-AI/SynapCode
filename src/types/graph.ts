export type ModuleKind = "page" | "component" | "service" | "hook" | "config" | "utility" | "test";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface CodeModule {
  id: string;
  path: string;
  label: string;
  kind: ModuleKind;
  imports: number;
  importedBy: number;
  loc?: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: "static" | "dynamic";
}

export interface GraphSnapshot {
  snapshotId?: string;
  truncated?: boolean;
  repository: string;
  branch: string;
  commit: string;
  analyzedAt: string;
  modules: CodeModule[];
  edges: DependencyEdge[];
  cycles: string[][];
  healthScore: number;
}

export interface ImpactResult {
  sourceId: string;
  affected: string[];
  paths: string[][];
  risk: RiskLevel;
}
