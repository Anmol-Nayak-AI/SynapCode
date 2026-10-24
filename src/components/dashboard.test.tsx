// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard";
import { demoSnapshot } from "@/lib/demo-data";

vi.mock("@/components/dependency-graph", () => ({
  DependencyGraph: () => <div>Dependency graph canvas</div>,
}));

vi.mock("@/components/account-controls", () => ({
  AccountControls: () => <div>Account</div>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("Dashboard navigation", () => {
  it("switches every workspace tab to its corresponding view", () => {
    render(<Dashboard persistenceEnabled />);

    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByRole("heading", { name: "Architecture overview" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Impact analysis" }));
    expect(screen.getByRole("heading", { name: "Impact analysis" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /AI investigator/ }));
    expect(screen.getByRole("heading", { name: "AI investigator" })).toBeTruthy();
    expect(screen.queryByText("Beta")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Members/ }));
    expect(screen.getByRole("heading", { name: "Console members" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
  });

  it("switches the dependency visualization to the module list", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("button", { name: /API Client/ })).toBeTruthy();
  });

  it("navigates between related modules from module details", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /src\/config\/env\.ts/ }));
    expect(screen.getByRole("heading", { name: "Config" })).toBeTruthy();
  });

  it("opens module search and filters by module path or label", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Search modules/ }));
    const input = screen.getByPlaceholderText("Search modules by name, path, or type…");
    fireEvent.change(input, { target: { value: "auth" } });

    expect(screen.getByRole("button", { name: /Auth/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Data Table/ })).toBeNull();
  });

  it("runs a fresh investigation when an AI module is selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "Auth has two verified downstream consumers.",
        evidence: ["src/lib/auth.ts"],
        mode: "deterministic",
        status: "verified",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /AI investigator/ }));
    fireEvent.click(screen.getByRole("button", { name: /Auth/ }));

    expect(screen.getByDisplayValue("What is the change impact of src/lib/auth.ts?")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/agent", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(screen.getByText("Auth has two verified downstream consumers.")).toBeTruthy());
  });

  it("shows a retry action for investigator request failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "The investigator is temporarily unavailable." }),
    }));
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /AI investigator/ }));
    fireEvent.click(screen.getByRole("button", { name: "What is the change impact of src/services/api.ts?" }));

    expect(await screen.findByText("The investigator is temporarily unavailable.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry investigation" })).toBeTruthy();
    expect(screen.queryByText("Insufficient evidence")).toBeNull();
  });

  it("keeps the newest answer when an older investigation resolves later", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ answer: "Newest answer", evidence: [], mode: "deterministic", status: "verified" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /AI investigator/ }));
    fireEvent.click(screen.getByRole("button", { name: /API Client src\/services\/api\.ts/ }));
    fireEvent.click(screen.getByRole("button", { name: /Auth src\/lib\/auth\.ts/ }));
    expect(await screen.findByText("Newest answer")).toBeTruthy();

    resolveFirst?.({ ok: true, status: 200, json: async () => ({ answer: "Stale answer", evidence: [], mode: "deterministic", status: "verified" }) });
    await Promise.resolve();
    expect(screen.queryByText("Stale answer")).toBeNull();
  });

  it("uses the theme-aware informational treatment for the demo snapshot", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /AI investigator/ }));
    const notice = screen.getByText("DEMO SNAPSHOT · not your repository").closest("p");

    expect(notice?.className).toContain("snapshot-notice-demo");
  });

  it("analyzes a repository and persists the dynamic workspace locally", async () => {
    const analyzed = { ...demoSnapshot, repository: "example/dynamic-app", commit: "abc123", analyzedAt: "2026-10-17T12:00:00.000Z" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => analyzed }));
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Analyze repo/ }));
    fireEvent.change(screen.getByPlaceholderText("owner/repository"), { target: { value: "example/dynamic-app" } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze repository" }));

    await waitFor(() => expect(screen.getByText("dynamic-app")).toBeTruthy());
    const saved = JSON.parse(window.localStorage.getItem("synapcode:workspace:v1") ?? "[]");
    expect(saved[0].fullName).toBe("example/dynamic-app");
    expect(saved[0].snapshots[0].commit).toBe("abc123");
  });

  it("hydrates repositories and members from an authenticated workspace", async () => {
    const persisted = { ...demoSnapshot, snapshotId: "5bf24f77-1391-4335-8508-ee1b099ce1e8", repository: "team/live-repo", commit: "def456" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organization: { id: "org-1", name: "Team", slug: "team" },
        repositories: [{ id: "repo-1", fullName: "team/live-repo", defaultBranch: "main", createdAt: persisted.analyzedAt, snapshots: [persisted], latestJob: null }],
        members: [{ userId: "user_123", role: "owner" }],
        agentRuns: [],
      }),
    }));
    render(<Dashboard authEnabled persistenceEnabled services={{ clerk: true, billing: true, supabase: true, inngest: true, openai: false, langsmith: false, github: true }} />);

    await waitFor(() => expect(screen.getByText("live-repo")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Members/ }));
    expect(await screen.findByText("user_123")).toBeTruthy();
  });
});
