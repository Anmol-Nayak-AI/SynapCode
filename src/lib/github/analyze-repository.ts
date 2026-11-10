import "server-only";

import { analyzeFiles, type SourceInput } from "@/lib/parser/analyze-files";

export interface GitHubTreeItem { path: string; type: string; size?: number; url: string }

const githubHeaders = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "SynapCode/1.0",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

async function github<T>(pathname: string): Promise<T> {
  const response = await fetch(`https://api.github.com${pathname}`, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json() as Promise<T>;
}

function encodedRepository(repository: string) {
  return repository.split("/").map(encodeURIComponent).join("/");
}

export async function resolveGitHubCommit(repository: string, ref: string) {
  const commit = await github<{ sha: string }>(`/repos/${encodedRepository(repository)}/commits/${encodeURIComponent(ref)}`);
  return commit.sha;
}

export async function fetchGitHubSources(repository: string, commitSha: string) {
  const tree = await github<{ tree: GitHubTreeItem[]; truncated: boolean }>(
    `/repos/${encodedRepository(repository)}/git/trees/${commitSha}?recursive=1`,
  );
  const sourceItems = tree.tree
    .filter((item) => item.type === "blob" && /\.[jt]sx?$/.test(item.path) && !/(^|\/)(node_modules|dist|build|\.next|coverage|vendor)\//.test(item.path));
  const candidates = sourceItems
    .filter((item) => (item.size ?? 0) <= 150_000)
    .slice(0, 250);
  if (!candidates.length) throw new Error("No analyzable JavaScript or TypeScript files were found.");

  const files: SourceInput[] = [];
  for (let index = 0; index < candidates.length; index += 12) {
    const batch = candidates.slice(index, index + 12);
    const blobs = await Promise.all(batch.map((item) => github<{ content: string; encoding: string }>(new URL(item.url).pathname)));
    batch.forEach((item, offset) => {
      const blob = blobs[offset];
      if (blob.encoding === "base64") files.push({ path: item.path, content: Buffer.from(blob.content, "base64").toString("utf8") });
    });
  }
  return { files, truncated: tree.truncated || files.length < sourceItems.length };
}

export async function analyzeGitHubRepository(repository: string, ref: string) {
  const commitSha = await resolveGitHubCommit(repository, ref);
  const source = await fetchGitHubSources(repository, commitSha);
  const snapshot = analyzeFiles(source.files, { repository, branch: ref, commit: commitSha });
  return { snapshot, truncated: source.truncated };
}
