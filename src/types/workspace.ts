import type { GraphSnapshot } from "@/types/graph";

export interface AnalysisJobSummary {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  requestedRef: string;
  commitSha: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkspaceRepository {
  id: string;
  fullName: string;
  defaultBranch: string;
  createdAt: string;
  snapshots: GraphSnapshot[];
  latestJob: AnalysisJobSummary | null;
}

export interface WorkspaceMember {
  userId: string;
  role: string;
}

export interface AgentRunSummary {
  id: string;
  question: string;
  answer: string;
  mode: string | null;
  createdAt: string;
  snapshotId: string;
}

export interface ServiceReadiness {
  clerk: boolean;
  billing: boolean;
  supabase: boolean;
  inngest: boolean;
  openai: boolean;
  langsmith: boolean;
  github: boolean;
}

export interface WorkspaceData {
  organization: { id: string; name: string; slug: string | null } | null;
  repositories: WorkspaceRepository[];
  members: WorkspaceMember[];
  agentRuns: AgentRunSummary[];
}
