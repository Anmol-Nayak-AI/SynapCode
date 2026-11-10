import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchGitHubSources } from "./analyze-repository";

afterEach(() => vi.unstubAllGlobals());

function mockRepository(count: number, oversized = false, encoding = "base64") {
  const tree = Array.from({ length: count }, (_, index) => ({
    path: `src/file-${index}.ts`, type: "blob", size: oversized && index === 0 ? 150_001 : 20,
    url: `https://api.github.com/repos/owner/repo/git/blobs/${index}`,
  }));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(
    url.includes("/git/trees/") ? { tree, truncated: false } : {
      content: Buffer.from("export const value = 1;").toString("base64"), encoding,
    },
  )));
}

describe("GitHub partial-analysis reporting", () => {
  it("does not flag a complete repository with exactly 250 files", async () => {
    mockRepository(250);
    const result = await fetchGitHubSources("owner/repo", "abc123");
    expect(result.files).toHaveLength(250);
    expect(result.truncated).toBe(false);
  });

  it("warns when the file count limit excludes source files", async () => {
    mockRepository(251);
    expect((await fetchGitHubSources("owner/repo", "abc123")).truncated).toBe(true);
  });

  it("warns when oversized source files are excluded", async () => {
    mockRepository(2, true);
    const result = await fetchGitHubSources("owner/repo", "abc123");
    expect(result.files).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it("warns when a blob cannot be decoded", async () => {
    mockRepository(1, false, "none");
    expect((await fetchGitHubSources("owner/repo", "abc123")).truncated).toBe(true);
  });
});
