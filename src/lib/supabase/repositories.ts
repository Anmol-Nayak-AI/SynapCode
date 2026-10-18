import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { GraphSnapshot } from "@/types/graph";
import type { AgentRunSummary, AnalysisJobSummary, WorkspaceData, WorkspaceRepository } from "@/types/workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeRole(role: string) {
  if (role.includes("owner")) return "owner";
  if (role.includes("admin")) return "admin";
  if (role.includes("viewer")) return "viewer";
  return "member";
}

export async function findOrganizationId(clerkOrganizationId: string, clerkUserId?: string) {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.from("organizations").select("id").eq("clerk_org_id", clerkOrganizationId).maybeSingle();
  if (existing.error) throw new Error(`Organization lookup failed: ${existing.error.message}`);
  if (existing.data) return existing.data.id as string;
  if (!clerkUserId) throw new Error("Organization is not provisioned.");

  // Webhooks remain the durable synchronization path. This authenticated
  // fallback removes the race between first organization creation and webhook delivery.
  const clerk = await clerkClient();
  const [organization, memberships] = await Promise.all([
    clerk.organizations.getOrganization({ organizationId: clerkOrganizationId }),
    clerk.users.getOrganizationMembershipList({ userId: clerkUserId, limit: 100 }),
  ]);
  const membership = memberships.data.find((item) => item.organization.id === clerkOrganizationId);
  if (!membership) throw new Error("The signed-in user is not a member of this organization.");
  const provisioned = await supabase.from("organizations").upsert({
    clerk_org_id: organization.id,
    name: organization.name,
    slug: organization.slug,
    image_url: organization.imageUrl,
  }, { onConflict: "clerk_org_id" }).select("id").single();
  if (provisioned.error) throw new Error(`Organization provisioning failed: ${provisioned.error.message}`);
  const member = await supabase.from("organization_members").upsert({
    organization_id: provisioned.data.id,
    clerk_user_id: clerkUserId,
    role: normalizeRole(membership.role),
  }, { onConflict: "organization_id,clerk_user_id" });
  if (member.error) throw new Error(`Membership provisioning failed: ${member.error.message}`);
  return provisioned.data.id as string;
}

export async function getOrganizationUsage(organizationId: string, repositoryName: string) {
  const supabase = createSupabaseAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [repositories, analyses, existingRepository] = await Promise.all([
    supabase.from("repositories").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("analysis_jobs").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", monthStart.toISOString()),
    supabase.from("repositories").select("id").eq("organization_id", organizationId).eq("github_full_name", repositoryName).maybeSingle(),
  ]);
  if (repositories.error) throw new Error(`Repository usage lookup failed: ${repositories.error.message}`);
  if (analyses.error) throw new Error(`Analysis usage lookup failed: ${analyses.error.message}`);
  if (existingRepository.error) throw new Error(`Repository lookup failed: ${existingRepository.error.message}`);
  return { repositories: repositories.count ?? 0, analysesThisMonth: analyses.count ?? 0, repositoryExists: Boolean(existingRepository.data) };
}

export async function upsertRepository(organizationId: string, githubFullName: string, defaultBranch: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("repositories").upsert(
    { organization_id: organizationId, github_full_name: githubFullName, default_branch: defaultBranch },
    { onConflict: "organization_id,github_full_name" },
  ).select("id, organization_id, github_full_name, default_branch").single();
  if (error) throw new Error(`Repository persistence failed: ${error.message}`);
  return data as { id: string; organization_id: string; github_full_name: string; default_branch: string };
}

export async function createAnalysisJob(input: { organizationId: string; repositoryId: string; requestedBy: string; requestedRef: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("analysis_jobs").insert({
    organization_id: input.organizationId,
    repository_id: input.repositoryId,
    requested_by: input.requestedBy,
    requested_ref: input.requestedRef,
    status: "queued",
  }).select("id, status, created_at").single();
  if (error) throw new Error(`Analysis job creation failed: ${error.message}`);
  return data as { id: string; status: string; created_at: string };
}

export async function updateAnalysisJob(jobId: string, values: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("analysis_jobs").update(values).eq("id", jobId);
  if (error) throw new Error(`Analysis job update failed: ${error.message}`);
}

export async function persistSnapshot(repositoryId: string, snapshot: GraphSnapshot) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("graph_snapshots").upsert({
    repository_id: repositoryId,
    commit_sha: snapshot.commit,
    graph: snapshot,
    health_score: snapshot.healthScore,
  }, { onConflict: "repository_id,commit_sha" }).select("id").single();
  if (error) throw new Error(`Snapshot persistence failed: ${error.message}`);
  return data as { id: string };
}

export async function getAnalysisJobForOrganization(jobId: string, organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("analysis_jobs")
    .select("id,status,requested_ref,commit_sha,error_code,error_message,created_at,started_at,completed_at,snapshot_id")
    .eq("id", jobId).eq("organization_id", organizationId).single();
  if (error) return null;
  return data;
}

export async function persistAgentRun(input: {
  organizationId: string;
  snapshotId: string;
  userId: string;
  question: string;
  answer: Record<string, unknown>;
  traceId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("agent_runs").insert({
    organization_id: input.organizationId,
    snapshot_id: input.snapshotId,
    clerk_user_id: input.userId,
    question: input.question,
    answer: input.answer,
    trace_id: input.traceId ?? null,
  });
  if (error) throw new Error(`Agent run persistence failed: ${error.message}`);
}

export async function getWorkspaceData(organizationId: string): Promise<WorkspaceData> {
  const supabase = createSupabaseAdminClient();
  const [organizationResult, repositoriesResult, membersResult, agentRunsResult] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").eq("id", organizationId).single(),
    supabase.from("repositories").select("id,github_full_name,default_branch,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("organization_members").select("clerk_user_id,role").eq("organization_id", organizationId).order("role"),
    supabase.from("agent_runs").select("id,question,answer,created_at,snapshot_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(12),
  ]);

  if (organizationResult.error) throw new Error(`Organization retrieval failed: ${organizationResult.error.message}`);
  if (repositoriesResult.error) throw new Error(`Repository retrieval failed: ${repositoriesResult.error.message}`);
  if (membersResult.error) throw new Error(`Membership retrieval failed: ${membersResult.error.message}`);
  if (agentRunsResult.error) throw new Error(`Agent history retrieval failed: ${agentRunsResult.error.message}`);

  const repositoryRows = repositoriesResult.data ?? [];
  const repositoryIds = repositoryRows.map((repository) => repository.id);
  const snapshotsByRepository = new Map<string, GraphSnapshot[]>();
  const jobsByRepository = new Map<string, AnalysisJobSummary>();

  if (repositoryIds.length > 0) {
    const [snapshotsResult, jobsResult] = await Promise.all([
      supabase.from("graph_snapshots").select("id,repository_id,graph,created_at").in("repository_id", repositoryIds).order("created_at", { ascending: false }),
      supabase.from("analysis_jobs").select("id,repository_id,status,requested_ref,commit_sha,error_message,created_at,completed_at").in("repository_id", repositoryIds).order("created_at", { ascending: false }),
    ]);
    if (snapshotsResult.error) throw new Error(`Snapshot retrieval failed: ${snapshotsResult.error.message}`);
    if (jobsResult.error) throw new Error(`Analysis history retrieval failed: ${jobsResult.error.message}`);

    for (const row of snapshotsResult.data ?? []) {
      const graph = row.graph as unknown as GraphSnapshot;
      const snapshot = { ...graph, snapshotId: row.id, analyzedAt: graph.analyzedAt || row.created_at };
      snapshotsByRepository.set(row.repository_id, [...(snapshotsByRepository.get(row.repository_id) ?? []), snapshot]);
    }
    for (const row of jobsResult.data ?? []) {
      if (jobsByRepository.has(row.repository_id)) continue;
      jobsByRepository.set(row.repository_id, {
        id: row.id,
        status: row.status as AnalysisJobSummary["status"],
        requestedRef: row.requested_ref,
        commitSha: row.commit_sha,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      });
    }
  }

  const repositories: WorkspaceRepository[] = repositoryRows.map((repository) => ({
    id: repository.id,
    fullName: repository.github_full_name,
    defaultBranch: repository.default_branch,
    createdAt: repository.created_at,
    snapshots: snapshotsByRepository.get(repository.id) ?? [],
    latestJob: jobsByRepository.get(repository.id) ?? null,
  }));

  const agentRuns: AgentRunSummary[] = (agentRunsResult.data ?? []).map((run) => {
    const answer = run.answer && typeof run.answer === "object" && !Array.isArray(run.answer) ? run.answer as Record<string, unknown> : {};
    return {
      id: run.id,
      question: run.question,
      answer: typeof answer.answer === "string" ? answer.answer : "",
      mode: typeof answer.mode === "string" ? answer.mode : null,
      createdAt: run.created_at,
      snapshotId: run.snapshot_id,
    };
  });

  return {
    organization: organizationResult.data,
    repositories,
    members: (membersResult.data ?? []).map((member) => ({ userId: member.clerk_user_id, role: member.role })),
    agentRuns,
  };
}
