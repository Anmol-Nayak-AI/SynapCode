import { analyzeFiles } from "@/lib/parser/analyze-files";
import { fetchGitHubSources, resolveGitHubCommit } from "@/lib/github/analyze-repository";
import { persistSnapshot, updateAnalysisJob } from "@/lib/supabase/repositories";
import { inngest } from "@/inngest/client";

export const analyzeRepository = inngest.createFunction(
  {
    id: "analyze-repository",
    retries: 4,
    idempotency: "event.data.jobId",
    concurrency: { limit: 4 },
  },
  { event: "synapcode/repository.analysis.requested" },
  async ({ event, step }) => {
    const { jobId, repositoryId, repository, ref } = event.data;
    try {
      await step.run("mark-analysis-running", () => updateAnalysisJob(jobId, {
        status: "running",
        started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      }));

      const commitSha = await step.run("resolve-immutable-commit", () => resolveGitHubCommit(repository, ref));
      await step.run("record-commit", () => updateAnalysisJob(jobId, { commit_sha: commitSha }));
      const source = await step.run("fetch-bounded-source", () => fetchGitHubSources(repository, commitSha));
      const snapshot = await step.run("build-dependency-graph", () => ({
        ...analyzeFiles(source.files, { repository, branch: ref, commit: commitSha }),
        truncated: source.truncated,
      }));
      const persisted = await step.run("persist-immutable-snapshot", () => persistSnapshot(repositoryId, snapshot));
      await step.run("mark-analysis-complete", () => updateAnalysisJob(jobId, {
        status: "completed",
        snapshot_id: persisted.id,
        completed_at: new Date().toISOString(),
      }));

      return { jobId, snapshotId: persisted.id, commitSha, truncated: source.truncated };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown analysis failure";
      await step.run("record-analysis-failure", () => updateAnalysisJob(jobId, {
        status: "failed",
        error_code: "ANALYSIS_FAILED",
        error_message: message.slice(0, 500),
        completed_at: new Date().toISOString(),
      }));
      throw error;
    }
  },
);
