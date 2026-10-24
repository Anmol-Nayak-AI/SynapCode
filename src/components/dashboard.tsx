"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowRight, Bot, Boxes, Check, ChevronDown, CircleDot, Clock3, Code2, GitBranch, GitFork,
  Info, LayoutDashboard, Loader2, MessageSquareText, Network, Plus, Search, Send, Settings,
  ShieldCheck, Sparkles, TriangleAlert, Users, X,
} from "lucide-react";
import { DependencyGraph } from "@/components/dependency-graph";
import { Logo } from "@/components/logo";
import { AccountControls } from "@/components/account-controls";
import { ThemeToggle } from "@/components/theme-toggle";
import { calculateImpact } from "@/lib/graph/analysis";
import { demoSnapshot } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import type { CodeModule, GraphSnapshot } from "@/types/graph";
import type { AgentRunSummary, ServiceReadiness, WorkspaceData, WorkspaceMember, WorkspaceRepository } from "@/types/workspace";

type WorkspaceView = "overview" | "graph" | "impact" | "agent" | "members" | "settings";
type InvestigatorAnswer = {
  text: string;
  evidence: string[];
  mode?: "deterministic" | "openai";
  status: "verified" | "insufficient_evidence" | "error";
  notice?: string;
};

const nav: { id: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "graph", label: "Dependency graph", icon: Network },
  { id: "impact", label: "Impact analysis", icon: Activity },
  { id: "agent", label: "AI investigator", icon: MessageSquareText },
];

const viewCopy: Record<WorkspaceView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Repository intelligence", title: "Architecture overview", description: "Monitor structure, coupling, and repository health from the latest snapshot." },
  graph: { eyebrow: "Live architecture snapshot", title: "Dependency explorer", description: "Trace architecture, investigate coupling, and predict change impact." },
  impact: { eyebrow: "Change intelligence", title: "Impact analysis", description: "Select a module and inspect every verified downstream dependency path." },
  agent: { eyebrow: "Grounded investigation", title: "AI investigator", description: "Ask architecture questions answered only from the current dependency graph." },
  members: { eyebrow: "Organization access", title: "Console members", description: "Review the team boundary used to authorize repositories and analysis history." },
  settings: { eyebrow: "Console configuration", title: "Settings", description: "Review environment readiness and repository-analysis defaults." },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const numberFormatter = new Intl.NumberFormat("en-US");
const localWorkspaceKey = "synapcode:workspace:v1";
const demoRepository: WorkspaceRepository = {
  id: "demo:acme/atlas-web",
  fullName: demoSnapshot.repository,
  defaultBranch: demoSnapshot.branch,
  createdAt: demoSnapshot.analyzedAt,
  snapshots: [demoSnapshot],
  latestJob: null,
};
const defaultServices: ServiceReadiness = { clerk: false, billing: false, supabase: false, inngest: false, openai: false, langsmith: false, github: false };

export function Dashboard({ authEnabled = false, persistenceEnabled = false, services = defaultServices }: { authEnabled?: boolean; persistenceEnabled?: boolean; services?: ServiceReadiness }) {
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(demoSnapshot);
  const [selected, setSelected] = useState<CodeModule>(demoSnapshot.modules[3]);
  const [repositories, setRepositories] = useState<WorkspaceRepository[]>([demoRepository]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRunSummary[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(authEnabled && persistenceEnabled);
  const [workspaceError, setWorkspaceError] = useState("");
  const [activeView, setActiveView] = useState<WorkspaceView>("graph");
  const [graphMode, setGraphMode] = useState<"graph" | "list">("graph");
  const [panel, setPanel] = useState<"details" | "agent">("details");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [repoModal, setRepoModal] = useState(false);
  const [repo, setRepo] = useState("vercel/swr");
  const [ref, setRef] = useState("main");
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<InvestigatorAnswer | null>(null);
  const investigationRequest = useRef<{ id: number; controller: AbortController } | null>(null);
  const investigationSequence = useRef(0);

  const impact = useMemo(() => calculateImpact(selected.id, snapshot.edges), [selected, snapshot]);
  const totalLoc = snapshot.modules.reduce((sum, module) => sum + (module.loc ?? 0), 0);
  const filteredModules = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return snapshot.modules;
    return snapshot.modules.filter((module) => `${module.label} ${module.path} ${module.kind}`.toLowerCase().includes(normalized));
  }, [searchQuery, snapshot.modules]);
  const pendingJobKey = repositories
    .filter((item) => item.latestJob && ["queued", "running"].includes(item.latestJob.status))
    .map((item) => item.latestJob!.id)
    .sort()
    .join(",");
  const agentSuggestions = [`What is the change impact of ${selected.path}?`, "Which module has the widest impact?", "Are there circular dependencies in this snapshot?"];
  const copy = viewCopy[activeView];

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => () => investigationRequest.current?.controller.abort(), []);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateWorkspace() {
      if (authEnabled && persistenceEnabled) {
        setWorkspaceLoading(true);
        try {
          const response = await fetch("/api/workspace", { cache: "no-store" });
          const payload = await response.json() as WorkspaceData & { error?: string };
          if (!response.ok) throw new Error(payload.error ?? "Console loading failed");
          if (cancelled) return;
          setRepositories(payload.repositories);
          setMembers(payload.members);
          setAgentRuns(payload.agentRuns);
          const latest = payload.repositories.flatMap((item) => item.snapshots).sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt))[0];
          if (latest) selectSnapshot(latest);
        } catch (error) {
          if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Console loading failed");
        } finally {
          if (!cancelled) setWorkspaceLoading(false);
        }
        return;
      }

      try {
        const saved = window.localStorage.getItem(localWorkspaceKey);
        if (!saved) return;
        const parsed = JSON.parse(saved) as WorkspaceRepository[];
        const valid = parsed.filter((item) => item && typeof item.fullName === "string" && Array.isArray(item.snapshots) && item.snapshots.length > 0);
        if (cancelled || valid.length === 0) return;
        setRepositories(valid);
        const latest = valid.flatMap((item) => item.snapshots).sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt))[0];
        if (latest) selectSnapshot(latest);
      } catch {
        window.localStorage.removeItem(localWorkspaceKey);
      }
    }
    void hydrateWorkspace();
    return () => { cancelled = true; };
  }, [authEnabled, persistenceEnabled]);

  useEffect(() => {
    if (!authEnabled || !persistenceEnabled || !pendingJobKey) return;
    let cancelled = false;
    const jobIds = pendingJobKey.split(",");
    async function pollPendingJobs() {
      try {
        const results = await Promise.all(jobIds.map(async (jobId) => {
          const response = await fetch(`/api/repositories/jobs/${jobId}`, { cache: "no-store" });
          return response.ok ? response.json() : null;
        }));
        if (cancelled) return;
        const completed = results.find((result) => result?.status === "completed" && result.snapshot?.snapshotId);
        if (completed) await refreshWorkspace(completed.snapshot.snapshotId);
        else if (results.some((result) => result?.status === "failed")) await refreshWorkspace();
      } catch (error) {
        if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Job status refresh failed");
      }
    }
    void pollPendingJobs();
    const interval = window.setInterval(() => void pollPendingJobs(), 3_000);
    return () => { cancelled = true; window.clearInterval(interval); };
    // The stable pending-job key controls polling; refreshWorkspace intentionally uses current state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authEnabled, persistenceEnabled, pendingJobKey]);

  function selectSnapshot(nextSnapshot: GraphSnapshot) {
    investigationRequest.current?.controller.abort();
    setSnapshot(nextSnapshot);
    setSelected(nextSnapshot.modules[0] ?? demoSnapshot.modules[0]);
    setAnswer(null);
    setQuestion("");
    setPanel("details");
    setRepoModal(false);
  }

  function persistLocalRepositories(nextRepositories: WorkspaceRepository[]) {
    setRepositories(nextRepositories);
    window.localStorage.setItem(localWorkspaceKey, JSON.stringify(nextRepositories));
  }

  async function refreshWorkspace(preferredSnapshotId?: string) {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    const payload = await response.json() as WorkspaceData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Console refresh failed");
    setRepositories(payload.repositories);
    setMembers(payload.members);
    setAgentRuns(payload.agentRuns);
    const allSnapshots = payload.repositories.flatMap((item) => item.snapshots);
    const preferred = preferredSnapshotId ? allSnapshots.find((item) => item.snapshotId === preferredSnapshotId) : undefined;
    const latest = preferred ?? allSnapshots.sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt))[0];
    if (latest) selectSnapshot(latest);
  }

  function openModule(module: CodeModule, view: WorkspaceView = "graph") {
    setSelected(module);
    setPanel("details");
    changeView(view);
    setSearchOpen(false);
    setSearchQuery("");
  }

  function changeView(view: WorkspaceView) {
    setActiveView(view);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function draftQuestion(value: string) {
    setQuestion(value);
    setAnswer(null);
  }

  async function analyzeRepository() {
    setLoadingRepo(true); setRepoError("");
    try {
      const durableAnalysis = authEnabled && persistenceEnabled && services.inngest;
      const endpoint = durableAnalysis ? "/api/repositories" : "/api/github";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repository: repo, ref }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Analysis failed");
      if (!durableAnalysis) {
        const nextSnapshot = payload as GraphSnapshot;
        const existing = repositories.find((item) => item.fullName === nextSnapshot.repository);
        const nextRepository: WorkspaceRepository = {
          id: existing?.id ?? `local:${nextSnapshot.repository}`,
          fullName: nextSnapshot.repository,
          defaultBranch: nextSnapshot.branch,
          createdAt: existing?.createdAt ?? nextSnapshot.analyzedAt,
          snapshots: [nextSnapshot, ...(existing?.snapshots ?? []).filter((item) => item.commit !== nextSnapshot.commit)],
          latestJob: null,
        };
        const nextRepositories = [nextRepository, ...repositories.filter((item) => item.fullName !== nextSnapshot.repository && !item.id.startsWith("demo:"))];
        persistLocalRepositories(nextRepositories);
        selectSnapshot(nextSnapshot);
        return;
      }
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        const statusResponse = await fetch(`/api/repositories/jobs/${payload.jobId}`, { cache: "no-store" });
        const status = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(status.error ?? "Could not read analysis status");
        if (status.status === "failed") throw new Error(status.error_message ?? "Repository analysis failed");
        if (status.status === "completed" && status.snapshot) {
          await refreshWorkspace(status.snapshot.snapshotId);
          return;
        }
      }
      throw new Error("Analysis is still running. You can safely close this dialog and check again shortly.");
    } catch (error) { setRepoError(error instanceof Error ? error.message : "Analysis failed"); }
    finally { setLoadingRepo(false); }
  }

  async function askAgent(prompt = question) {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return;
    investigationRequest.current?.controller.abort();
    const requestId = investigationSequence.current + 1;
    investigationSequence.current = requestId;
    const controller = new AbortController();
    investigationRequest.current = { id: requestId, controller };
    setPanel("agent"); setQuestion(normalizedPrompt); setAsking(true); setAnswer(null);
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: normalizedPrompt, snapshot }), signal: controller.signal });
      const payload = await response.json().catch(() => null) as { answer?: string; evidence?: string[]; mode?: "deterministic" | "openai"; status?: "verified" | "insufficient_evidence"; notice?: string; error?: string } | null;
      if (!response.ok) {
        const message = response.status === 401
          ? "Sign in and select an organization before using the investigator."
          : response.status === 429
            ? "The investigator is receiving too many requests. Please wait a moment and retry."
            : payload?.error ?? "The investigator is temporarily unavailable. Please retry.";
        throw new Error(message);
      }
      if (!payload?.answer || !payload.status) throw new Error("The investigator returned an incomplete response. Please retry.");
      if (investigationRequest.current?.id !== requestId) return;
      const nextAnswer: InvestigatorAnswer = { text: payload.answer, evidence: payload.evidence ?? [], mode: payload.mode, status: payload.status, notice: payload.notice };
      setAnswer(nextAnswer);
      setAgentRuns((current) => [{ id: `session:${Date.now()}`, question: normalizedPrompt, answer: nextAnswer.text, mode: nextAnswer.mode ?? null, createdAt: new Date().toISOString(), snapshotId: snapshot.snapshotId ?? `${snapshot.repository}:${snapshot.commit}` }, ...current].slice(0, 12));
    } catch (error) {
      if (controller.signal.aborted || investigationRequest.current?.id !== requestId) return;
      setAnswer({ text: error instanceof Error ? error.message : "The investigator is temporarily unavailable. Please retry.", evidence: [], status: "error" });
    } finally {
      if (investigationRequest.current?.id === requestId) {
        investigationRequest.current = null;
        setAsking(false);
      }
    }
  }

  return (
    <div className="spatial-shell flex min-h-screen bg-background/90 text-slate-300">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-violet-400/[.09] bg-panel-deep/90 shadow-[18px_0_70px_rgba(0,10,20,.22)] backdrop-blur-2xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/[.06] px-5"><Logo /></div>
        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-600">Console</p>
          <button onClick={() => setRepoModal(true)} className="flex w-full items-center gap-2.5 rounded-lg border border-white/[.08] bg-white/[.035] px-3 py-2.5 text-left transition hover:bg-white/[.06]">
            <span className="grid size-7 place-items-center rounded-md bg-violet-500/15 text-violet-300"><Code2 size={14} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-slate-200">{snapshot.repository}</span><span className="block text-[9px] text-slate-600">{snapshot.branch} · {snapshot.commit}</span></span>
            <ChevronDown size={13} className="text-slate-600" />
          </button>
        </div>
        <nav className="space-y-1 px-3">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => changeView(id)} aria-current={activeView === id ? "page" : undefined} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] transition", activeView === id ? "bg-violet-500/12 text-violet-300" : "text-slate-500 hover:bg-white/[.035] hover:text-slate-300")}><Icon size={15} strokeWidth={1.8} /><span className="flex-1 text-left">{label}</span></button>)}
        </nav>
        <div className="mt-6 px-3"><p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-600">Team</p><button onClick={() => changeView("members")} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] transition", activeView === "members" ? "bg-violet-500/12 text-violet-300" : "text-slate-500 hover:bg-white/[.035] hover:text-slate-300")}><Users size={15} />Members<span className="ml-auto text-[8px]">{workspaceLoading ? "…" : members.length || (authEnabled ? 0 : "Demo")}</span></button></div>
        <div className="mt-auto p-3"><div className="rounded-xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[.08] to-cyan-400/[.035] p-3"><div className="flex items-center gap-2 text-[10px] font-medium text-slate-300"><ShieldCheck size={14} className={snapshot.cycles.length ? "text-amber-300" : "text-emerald-400"} />{snapshot.cycles.length ? "Review recommended" : "Analysis healthy"}</div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.06]"><div style={{ width: `${snapshot.healthScore}%` }} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div><p className="mt-2 text-[9px] leading-relaxed text-slate-500">Score {snapshot.healthScore}/100 · {snapshot.cycles.length} circular path{snapshot.cycles.length === 1 ? "" : "s"}.</p></div><button onClick={() => changeView("settings")} className={cn("mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] transition", activeView === "settings" ? "bg-violet-500/12 text-violet-300" : "text-slate-500 hover:bg-white/[.035] hover:text-slate-300")}><Settings size={14} />Settings</button></div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[220px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-violet-400/[.09] bg-panel-deep/[.78] px-4 shadow-[0_12px_50px_rgba(0,10,20,.18)] backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden"><Logo compact /><label className="sr-only" htmlFor="mobile-console-view">Console view</label><select id="mobile-console-view" value={activeView} onChange={(event) => changeView(event.target.value as WorkspaceView)} className="max-w-32 rounded-lg border border-white/[.08] bg-panel-strong px-2 py-2 text-[10px] text-slate-300 outline-none sm:max-w-none"><option value="overview">Overview</option><option value="graph">Graph</option><option value="impact">Impact</option><option value="agent">Investigator</option><option value="members">Members</option><option value="settings">Settings</option></select></div>
          <div className="hidden items-center gap-2 text-[11px] sm:flex"><span className="text-slate-600">Repositories</span><span className="text-slate-700">/</span><span className="text-slate-300">{snapshot.repository.split("/").at(-1)}</span><span className="ml-2 flex items-center gap-1.5 rounded-md bg-white/[.04] px-2 py-1 text-[9px] text-slate-500"><GitBranch size={10} />{snapshot.branch}</span></div>
          <div className="flex items-center gap-2"><button onClick={() => setSearchOpen(true)} className="hidden items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.025] px-3 py-2 text-[10px] text-slate-500 transition hover:border-violet-400/20 hover:text-slate-300 md:flex"><Search size={13} />Search modules <kbd className="ml-5 text-[8px] text-slate-700">⌘K</kbd></button><ThemeToggle compact /><button onClick={() => setRepoModal(true)} aria-label="Analyze repo" className="flex items-center gap-1.5 rounded-lg border border-violet-300/20 bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-2 text-[10px] font-semibold text-[var(--accent-contrast)] shadow-[0_8px_28px_rgba(0,242,254,.18)] transition hover:brightness-110"><Plus size={13} /><span className="hidden sm:inline">Analyze repo</span></button><AccountControls enabled={authEnabled} /></div>
        </header>

        <div className="p-4 pb-8 sm:p-5 lg:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><div className="mb-1.5 flex items-center gap-2 text-[9px] font-medium uppercase tracking-[.16em] text-violet-400"><CircleDot size={10} className="fill-emerald-400 text-emerald-400" />{copy.eyebrow}</div><h1 className="text-xl font-semibold tracking-[-.03em] text-slate-50 sm:text-2xl">{copy.title}</h1><p className="mt-1 max-w-2xl text-[11px] text-slate-500">{copy.description}</p>{workspaceError && <p className="mt-2 text-[9px] text-amber-300">Console sync: {workspaceError}</p>}</div><div className="flex items-center gap-3 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><Clock3 size={11} />Analyzed {dateFormatter.format(new Date(snapshot.analyzedAt))}</span><span className={cn("rounded-md border px-2 py-1", snapshot.truncated ? "border-amber-400/15 bg-amber-400/[.06] text-amber-300" : "border-emerald-400/15 bg-emerald-400/[.06] text-emerald-400")}><Check size={10} className="mr-1 inline" />{snapshot.truncated ? "Partial snapshot" : "Snapshot loaded"}</span></div></div>

          <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric icon={Boxes} label="Modules" value={numberFormatter.format(snapshot.modules.length)} trend={`${snapshot.edges.length} relationships`} color="violet" />
            <Metric icon={GitBranch} label="Dependencies" value={numberFormatter.format(snapshot.edges.length)} trend={`${Math.round(snapshot.edges.length / Math.max(snapshot.modules.length, 1) * 10) / 10} per module`} color="cyan" />
            <Metric icon={TriangleAlert} label="Circular paths" value={snapshot.cycles.length.toString()} trend={snapshot.cycles.length ? "Needs review" : "None detected"} color={snapshot.cycles.length ? "amber" : "emerald"} />
            <Metric icon={Activity} label="Architecture score" value={`${snapshot.healthScore}`} suffix="/100" trend={`${numberFormatter.format(totalLoc)} lines mapped`} color="emerald" />
          </section>

          {activeView === "graph" && <section className="holo-panel mt-4 grid overflow-hidden rounded-2xl border border-violet-400/10 shadow-[0_24px_80px_rgba(0,8,18,.28)] xl:h-[calc(100vh-245px)] xl:min-h-[520px] xl:max-h-[680px] xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="relative min-h-[520px] overflow-hidden border-b border-white/[.07] xl:min-h-0 xl:border-b-0 xl:border-r">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-panel-strong/90 p-1 shadow-xl backdrop-blur"><button onClick={() => setGraphMode("graph")} className={cn("rounded-md px-3 py-1.5 text-[9px] font-medium", graphMode === "graph" ? "bg-white/[.07] text-slate-200" : "text-slate-600 hover:text-slate-300")}>Graph</button><button onClick={() => setGraphMode("list")} className={cn("rounded-md px-3 py-1.5 text-[9px] font-medium", graphMode === "list" ? "bg-white/[.07] text-slate-200" : "text-slate-600 hover:text-slate-300")}>List</button></div>
              <div className="absolute right-4 top-4 z-10 flex items-center gap-3 rounded-lg border border-white/[.08] bg-panel-strong/90 px-3 py-2 text-[8px] text-slate-500 backdrop-blur"><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-cyan-400" />Static import</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400" />Dynamic import</span></div>
              {graphMode === "graph" ? <DependencyGraph snapshot={snapshot} onSelect={(module) => { setSelected(module); setPanel("details"); }} /> : <ModuleList modules={snapshot.modules} selected={selected} onSelect={(module) => { setSelected(module); setPanel("details"); }} />}
            </div>

            <aside className="flex min-h-[520px] min-w-0 flex-col overflow-hidden bg-panel-deep xl:min-h-0">
              <div className="flex border-b border-white/[.07] p-1.5"><button onClick={() => setPanel("details")} className={cn("flex-1 rounded-md py-2 text-[9px] font-medium", panel === "details" ? "bg-white/[.05] text-slate-200" : "text-slate-600")}>Module detail</button><button onClick={() => setPanel("agent")} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[9px] font-medium", panel === "agent" ? "bg-violet-500/10 text-violet-300" : "text-slate-600")}><Sparkles size={10} />Ask AI</button></div>
              {panel === "details" ? <ModuleDetails module={selected} snapshot={snapshot} impact={impact} onSelect={setSelected} onAsk={() => { draftQuestion(`What is the change impact of ${selected.path}?`); setPanel("agent"); }} /> : <AgentPanel question={question} setQuestion={draftQuestion} asking={asking} answer={answer} askAgent={askAgent} suggestions={agentSuggestions} onEvidence={(path) => { const selectedModule = snapshot.modules.find((item) => item.path === path); if (selectedModule) { setSelected(selectedModule); setPanel("details"); } }} />}
            </aside>
          </section>}
          {activeView === "overview" && <OverviewPanel snapshot={snapshot} runs={agentRuns.filter((run) => run.snapshotId === snapshot.snapshotId || run.snapshotId === `${snapshot.repository}:${snapshot.commit}`)} onOpenModule={(module) => openModule(module)} onOpenGraph={() => changeView("graph")} onRun={(prompt) => { changeView("agent"); void askAgent(prompt); }} />}
          {activeView === "impact" && <ImpactPanel snapshot={snapshot} selected={selected} impact={impact} onSelect={setSelected} onInvestigate={() => { draftQuestion(`What is the change impact of ${selected.path}?`); changeView("agent"); }} />}
          {activeView === "agent" && <section className="holo-panel mt-4 grid overflow-hidden rounded-2xl border border-violet-400/10 shadow-[0_24px_80px_rgba(0,8,18,.26)] lg:h-[calc(100vh-245px)] lg:min-h-[540px] lg:max-h-[680px] lg:grid-cols-[280px_minmax(0,1fr)]"><div className="flex min-h-0 flex-col border-b border-white/[.07] lg:border-b-0 lg:border-r"><div className="shrink-0 px-4 pt-4"><p className="text-[9px] leading-relaxed text-slate-500">Select a module to run a grounded impact investigation.</p><p className={cn("mt-2 flex items-center gap-1.5 rounded-md border px-2.5 py-2 font-mono text-[9px] font-semibold", snapshot.repository === demoSnapshot.repository && snapshot.commit === demoSnapshot.commit ? "snapshot-notice-demo" : "snapshot-notice-success")}>{snapshot.repository === demoSnapshot.repository && snapshot.commit === demoSnapshot.commit && <Info aria-hidden="true" className="size-3 shrink-0" />}<span>{snapshot.repository === demoSnapshot.repository && snapshot.commit === demoSnapshot.commit ? "DEMO SNAPSHOT · not your repository" : `${snapshot.repository}@${snapshot.commit}`}</span></p></div><ModuleList modules={snapshot.modules} selected={selected} onSelect={(module) => { const prompt = `What is the change impact of ${module.path}?`; setSelected(module); void askAgent(prompt); }} compact /></div><div className="flex min-h-[520px] min-w-0 lg:min-h-0"><AgentPanel question={question} setQuestion={draftQuestion} asking={asking} answer={answer} askAgent={askAgent} suggestions={agentSuggestions} onEvidence={(path) => { const selectedModule = snapshot.modules.find((item) => item.path === path); if (selectedModule) openModule(selectedModule); }} /></div></section>}
          {activeView === "members" && <MembersPanel authEnabled={authEnabled} members={members} loading={workspaceLoading} />}
          {activeView === "settings" && <SettingsPanel services={services} repository={snapshot.repository} branch={snapshot.branch} repositoryCount={repositories.length} snapshotCount={repositories.reduce((sum, item) => sum + item.snapshots.length, 0)} agentRunCount={agentRuns.length} />}
        </div>
      </main>

      {searchOpen && <SearchDialog query={searchQuery} setQuery={setSearchQuery} modules={filteredModules} onClose={() => { setSearchOpen(false); setSearchQuery(""); }} onSelect={(module) => openModule(module)} />}
      {repoModal && <RepositoryDialog repositories={repositories} currentSnapshot={snapshot} loadingWorkspace={workspaceLoading} repository={repo} setRepository={setRepo} reference={ref} setReference={setRef} loadingAnalysis={loadingRepo} error={repoError} onAnalyze={() => void analyzeRepository()} onSelect={selectSnapshot} onClose={() => setRepoModal(false)} />}
    </div>
  );
}

function RepositoryDialog({ repositories, currentSnapshot, loadingWorkspace, repository, setRepository, reference, setReference, loadingAnalysis, error, onAnalyze, onSelect, onClose }: {
  repositories: WorkspaceRepository[];
  currentSnapshot: GraphSnapshot;
  loadingWorkspace: boolean;
  repository: string;
  setRepository: (value: string) => void;
  reference: string;
  setReference: (value: string) => void;
  loadingAnalysis: boolean;
  error: string;
  onAnalyze: () => void;
  onSelect: (snapshot: GraphSnapshot) => void;
  onClose: () => void;
}) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/75 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-panel-strong p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-foreground">Repository Console</h2><p className="mt-1 text-[10px] text-slate-500">Switch immutable snapshots or analyze a public GitHub repository.</p></div><button onClick={onClose} aria-label="Close repository Console" className="text-slate-600 hover:text-foreground"><X size={16} /></button></div>
      <div className="mt-5">
        <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Saved repositories</p>
        <div className="mt-2 space-y-2">
          {loadingWorkspace && <p className="rounded-xl border border-white/[.06] p-5 text-center text-[9px] text-slate-600">Loading saved repositories…</p>}
          {!loadingWorkspace && repositories.map((item) => <div key={item.id} className="rounded-xl border border-white/[.06] bg-black/10 p-3">
            <div className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate text-[10px] font-medium text-slate-300">{item.fullName}</span><span className="mt-0.5 block text-[8px] text-slate-600">{item.snapshots.length} snapshot{item.snapshots.length === 1 ? "" : "s"} · default {item.defaultBranch}</span></span>{item.latestJob && <span className={cn("rounded px-2 py-1 text-[7px] font-semibold uppercase", item.latestJob.status === "failed" ? "bg-red-400/10 text-red-300" : item.latestJob.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300")}>{item.latestJob.status}</span>}</div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{item.snapshots.slice(0, 6).map((itemSnapshot) => <button key={itemSnapshot.snapshotId ?? `${item.id}:${itemSnapshot.commit}`} onClick={() => onSelect(itemSnapshot)} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-left", currentSnapshot.repository === itemSnapshot.repository && currentSnapshot.commit === itemSnapshot.commit ? "border-violet-400/25 bg-violet-400/[.07]" : "border-white/[.05] bg-white/[.02] hover:border-white/10")}><span className="min-w-0"><span className="block truncate font-mono text-[8px] text-slate-400">{itemSnapshot.commit.slice(0, 12)}</span><span className="block text-[7px] text-slate-600">{itemSnapshot.branch} · {dateFormatter.format(new Date(itemSnapshot.analyzedAt))}</span></span>{currentSnapshot.repository === itemSnapshot.repository && currentSnapshot.commit === itemSnapshot.commit && <Check size={11} className="text-emerald-400" />}</button>)}</div>
            {item.snapshots.length === 0 && <p className="mt-2 rounded-lg border border-dashed border-white/[.06] p-3 text-[8px] text-slate-600">No completed snapshot yet{item.latestJob ? `; latest job is ${item.latestJob.status}.` : "."}</p>}
          </div>)}
          {!loadingWorkspace && repositories.length === 0 && <p className="rounded-xl border border-dashed border-white/[.06] p-5 text-center text-[9px] text-slate-600">No repositories analyzed yet.</p>}
        </div>
      </div>
      <form className="mt-6 border-t border-white/[.07] pt-5" onSubmit={(event) => { event.preventDefault(); onAnalyze(); }}>
        <h3 className="text-[11px] font-medium text-slate-200">Analyze another repository</h3><p className="mt-1 text-[9px] text-slate-600">Source is fetched through GitHub&apos;s API and is never executed.</p>
        <label className="mt-4 block text-[9px] font-medium uppercase tracking-wider text-slate-500">Repository</label><div className="mt-2 flex items-center rounded-lg border border-white/10 bg-black/15 px-3"><Code2 size={14} className="text-slate-600" /><input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" className="w-full bg-transparent px-2 py-3 text-[11px] text-foreground outline-none placeholder:text-slate-700" /></div>
        <label className="mt-4 block text-[9px] font-medium uppercase tracking-wider text-slate-500">Branch, tag, or commit</label><input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/15 px-3 py-3 text-[11px] text-foreground outline-none" />
        {error && <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-[10px] text-red-300">{error}</p>}
        <button type="submit" disabled={loadingAnalysis || !repository.trim() || !reference.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-[10px] font-semibold text-[var(--accent-contrast)] hover:bg-violet-500 disabled:opacity-60">{loadingAnalysis ? <Loader2 size={13} className="animate-spin" /> : <Network size={13} />}{loadingAnalysis ? "Building dependency graph…" : "Analyze repository"}</button>
      </form>
    </div>
  </div>;
}

function OverviewPanel({ snapshot, runs, onOpenModule, onOpenGraph, onRun }: { snapshot: GraphSnapshot; runs: AgentRunSummary[]; onOpenModule: (module: CodeModule) => void; onOpenGraph: () => void; onRun: (question: string) => void }) {
  const coupled = [...snapshot.modules].sort((a, b) => b.importedBy - a.importedBy).slice(0, 5);
  return <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="space-y-4">
      <div className="holo-panel rounded-2xl border border-violet-400/10 p-5">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Architecture summary</p><h2 className="mt-2 text-base font-semibold text-slate-100">{snapshot.repository}</h2></div><button onClick={onOpenGraph} className="flex shrink-0 items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[.07] px-3 py-2 text-[9px] font-medium text-violet-300 hover:bg-violet-400/10">Explore graph <ArrowRight size={11} /></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><SummaryCard label="Analyzed reference" value={snapshot.branch} /><SummaryCard label="Commit" value={snapshot.commit} mono /><SummaryCard label="Mapped lines" value={numberFormatter.format(snapshot.modules.reduce((sum, module) => sum + (module.loc ?? 0), 0))} /></div>
        <div className={cn("mt-5 rounded-xl border p-4", snapshot.cycles.length ? "border-amber-400/10 bg-amber-400/[.035]" : "border-emerald-400/10 bg-emerald-400/[.035]")}><div className={cn("flex items-center gap-2 text-[11px] font-medium", snapshot.cycles.length ? "text-amber-300" : "text-emerald-300")}><ShieldCheck size={15} />{snapshot.cycles.length ? `${snapshot.cycles.length} circular dependency chain${snapshot.cycles.length === 1 ? "" : "s"} detected` : "No circular dependencies detected"}</div><p className="mt-2 text-[9px] leading-relaxed text-slate-500">{snapshot.cycles.length ? "Review the dependency graph before changing modules in these cycles." : "The current snapshot passed graph integrity checks and is ready for impact analysis."}</p></div>
      </div>
      <AgentHistory runs={runs} onRun={onRun} embedded />
    </div>
    <div className="holo-panel rounded-2xl border border-violet-400/10 p-4"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Most depended-on modules</p><div className="mt-3 space-y-2">{coupled.map((module) => <button key={module.id} onClick={() => onOpenModule(module)} className="flex w-full items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[.05]"><span className="grid size-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><GitFork size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-slate-200">{module.label}</span><span className="mt-0.5 block truncate font-mono text-[8px] text-slate-500">{module.path}</span></span><span className="text-[9px] text-slate-500">{module.importedBy} refs</span></button>)}</div></div>
  </section>;
}

function SummaryCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl bg-white/[.025] p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">{label}</p><p className={cn("mt-2 text-[11px] font-medium text-slate-300", mono && "font-mono")}>{value}</p></div>;
}

function AgentHistory({ runs, onRun, embedded = false }: { runs: AgentRunSummary[]; onRun: (question: string) => void; embedded?: boolean }) {
  return <section className={cn("holo-panel rounded-2xl border border-violet-400/10 p-5", !embedded && "mt-4")}><div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Investigation history</p><h2 className="mt-2 text-sm font-semibold text-slate-100">Recent questions for this snapshot</h2></div><span className="text-[8px] text-slate-500">{runs.length} loaded</span></div><div className="mt-4 grid gap-2 lg:grid-cols-2">{runs.slice(0, 6).map((run) => <button key={run.id} onClick={() => onRun(run.question)} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left hover:border-violet-400/20"><span className="block truncate text-[10px] text-slate-300">{run.question}</span><span className="mt-1 block line-clamp-2 text-[8px] leading-relaxed text-slate-500">{run.answer}</span><span className="mt-2 block text-[7px] uppercase text-violet-400/70">{run.mode ?? "verified graph"} · ask again</span></button>)}{runs.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-white/[.06] p-5 text-center text-[9px] text-slate-500">No investigations have been recorded for this snapshot yet.</p>}</div></section>;
}

function ModuleList({ modules, selected, onSelect, compact = false }: { modules: CodeModule[]; selected: CodeModule; onSelect: (module: CodeModule) => void; compact?: boolean }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", !compact && "pt-20")}><p className="mb-3 text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">{modules.length} modules</p><div className="space-y-2">{modules.map((module) => <button key={module.id} onClick={() => onSelect(module)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", selected.id === module.id ? "border-violet-400/30 bg-violet-400/[.09]" : "border-white/[.06] bg-white/[.025] hover:border-white/12 hover:bg-white/[.04]")}><span className="grid size-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Code2 size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-slate-200">{module.label}</span><span className="mt-0.5 block truncate font-mono text-[8px] text-slate-500">{module.path}</span></span><span className="text-right text-[8px] text-slate-500"><span className="block">{module.imports} imports</span><span className="mt-0.5 block">{module.importedBy} used by</span></span></button>)}</div></div>;
}

function ImpactPanel({ snapshot, selected, impact, onSelect, onInvestigate }: { snapshot: GraphSnapshot; selected: CodeModule; impact: ReturnType<typeof calculateImpact>; onSelect: (module: CodeModule) => void; onInvestigate: () => void }) {
  const affected = impact.affected.map((id) => snapshot.modules.find((module) => module.id === id)).filter(Boolean) as CodeModule[];
  const paths = impact.paths.slice(0, 5).map((path) => path.map((id) => snapshot.modules.find((module) => module.id === id)?.label ?? id));
  return <section className="holo-panel mt-4 grid overflow-hidden rounded-2xl border border-violet-400/10 shadow-[0_24px_80px_rgba(0,8,18,.26)] lg:h-[calc(100vh-245px)] lg:min-h-[540px] lg:max-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)]"><div className="flex min-h-0 flex-col border-b border-white/[.07] lg:border-b-0 lg:border-r"><ModuleList modules={snapshot.modules} selected={selected} onSelect={onSelect} compact /></div><div className="min-h-0 overflow-y-auto p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Selected module</p><h2 className="mt-2 text-base font-semibold text-slate-100">{selected.label}</h2><p className="mt-1 font-mono text-[9px] text-slate-500">{selected.path}</p></div><span className={cn("w-fit rounded-md px-2 py-1 text-[8px] font-semibold uppercase", impact.risk === "low" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300")}>{impact.risk} risk</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><SummaryCard label="Affected modules" value={String(affected.length)} /><SummaryCard label="Verified paths" value={String(impact.paths.length)} /><SummaryCard label="Direct consumers" value={String(selected.importedBy)} /></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Downstream modules</p><div className="mt-3 space-y-2">{affected.map((module) => <button key={module.id} onClick={() => onSelect(module)} className="flex w-full items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-left hover:border-violet-400/20"><Activity size={14} className="text-amber-300" /><span className="min-w-0 flex-1"><span className="block text-[10px] text-slate-200">{module.label}</span><span className="block truncate font-mono text-[8px] text-slate-500">{module.path}</span></span><ArrowRight size={11} className="text-slate-600" /></button>)}{!affected.length && <div className="rounded-xl border border-dashed border-white/[.08] p-6 text-center text-[10px] text-slate-500">No downstream modules are affected.</div>}</div></div><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">Verified paths</p><div className="mt-3 space-y-2">{paths.map((path) => <div key={path.join("→")} className="rounded-xl border border-white/[.06] bg-black/10 p-3 font-mono text-[8px] leading-relaxed text-slate-400">{path.join(" → ")}</div>)}{!paths.length && <div className="rounded-xl border border-dashed border-white/[.08] p-6 text-center text-[10px] text-slate-500">This module has no reverse dependency paths.</div>}</div></div></div><button onClick={onInvestigate} className="mt-5 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-[9px] font-semibold text-[var(--accent-contrast)] hover:bg-violet-500"><Bot size={13} />Investigate this impact</button></div></section>;
}

function MembersPanel({ authEnabled, members, loading }: { authEnabled: boolean; members: WorkspaceMember[]; loading: boolean }) {
  return <section className="mt-4 holo-panel rounded-2xl p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-100">Organization directory</h2><p className="mt-1 text-[10px] text-slate-600">Memberships synchronized from Clerk define the tenant boundary.</p></div><div className="flex items-center gap-2">{authEnabled && <a href="/organization" className="rounded-lg border border-violet-400/20 px-3 py-2 text-[8px] font-semibold text-violet-300 hover:bg-violet-400/[.07]">Invite and manage</a>}<span className={cn("rounded-md px-2 py-1 text-[8px] font-semibold uppercase", authEnabled ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300")}>{authEnabled ? "Connected" : "Demo mode"}</span></div></div><div className="mt-6 overflow-hidden rounded-xl border border-white/[.07]"><div className="grid grid-cols-[minmax(0,1fr)_120px_100px] bg-white/[.025] px-4 py-3 text-[8px] font-semibold uppercase tracking-wider text-slate-600"><span>Member</span><span>Role</span><span>Status</span></div>{loading && <p className="border-t border-white/[.06] p-6 text-center text-[9px] text-slate-600">Loading organization members…</p>}{!loading && members.map((member) => <div key={member.userId} className="grid grid-cols-[minmax(0,1fr)_120px_100px] items-center border-t border-white/[.06] px-4 py-4"><span className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[9px] font-semibold text-[var(--accent-contrast)]">{member.userId.slice(-2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-[10px] text-slate-300">{member.userId}</span><span className="block text-[8px] text-slate-600">Clerk identity</span></span></span><span className="text-[9px] capitalize text-slate-500">{member.role}</span><span className="text-[9px] text-emerald-400">Active</span></div>)}{!loading && members.length === 0 && <p className="border-t border-white/[.06] p-6 text-center text-[9px] text-slate-600">{authEnabled ? "No synchronized members were returned." : "Member data appears after Clerk Organizations is connected."}</p>}</div></section>;
}

function SettingsPanel({ services, repository, branch, repositoryCount, snapshotCount, agentRunCount }: { services: ServiceReadiness; repository: string; branch: string; repositoryCount: number; snapshotCount: number; agentRunCount: number }) {
  const rows = [{ name: "Clerk identity", ready: services.clerk }, { name: "Clerk Billing", ready: services.billing }, { name: "Supabase persistence", ready: services.supabase }, { name: "Inngest durable jobs", ready: services.inngest }, { name: "OpenAI investigator", ready: services.openai }, { name: "LangSmith tracing", ready: services.langsmith }, { name: "GitHub elevated limits", ready: services.github }];
  return <section className="mt-4 grid gap-4 lg:grid-cols-2"><div className="holo-panel rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-100">Service readiness</h2><p className="mt-1 text-[9px] text-slate-600">Calculated from the server environment; no secret values are exposed.</p></div><a href="/pricing?from=console" className="rounded-lg border border-violet-400/20 px-3 py-2 text-[8px] font-semibold text-violet-300 hover:bg-violet-400/[.07]">Manage plan</a></div><div className="mt-4 space-y-2">{rows.map((service) => <div key={service.name} className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.02] p-3"><span className="flex items-center gap-2 text-[10px] text-slate-400"><CircleDot size={11} className={service.ready ? "fill-emerald-400 text-emerald-400" : "text-amber-300"} />{service.name}</span><span className={cn("text-[8px] font-semibold uppercase", service.ready ? "text-emerald-400" : "text-amber-300")}>{service.ready ? "Ready" : "Configure"}</span></div>)}</div></div><div className="space-y-4"><div className="holo-panel rounded-2xl p-5"><h2 className="text-sm font-semibold text-slate-100">Active analysis</h2><div className="mt-4 space-y-3"><SummaryCard label="Repository" value={repository} mono /><SummaryCard label="Analyzed reference" value={branch} mono /><SummaryCard label="Evidence mode" value={services.openai ? "AI explanation + verified graph" : "Deterministic verified graph"} /></div></div><div className="grid grid-cols-3 gap-3"><SummaryCard label="Repositories" value={String(repositoryCount)} /><SummaryCard label="Snapshots" value={String(snapshotCount)} /><SummaryCard label="Recent runs" value={String(agentRunCount)} /></div></div></section>;
}

function SearchDialog({ query, setQuery, modules, onClose, onSelect }: { query: string; setQuery: (value: string) => void; modules: CodeModule[]; onClose: () => void; onSelect: (module: CodeModule) => void }) {
  return <div className="fixed inset-0 z-50 flex justify-center bg-overlay/80 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}><div className="h-fit w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-panel-strong shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/[.07] px-4"><Search size={16} className="text-slate-600" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules by name, path, or type…" className="h-14 min-w-0 flex-1 bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-700" /><button onClick={onClose} className="rounded-md border border-white/[.07] px-2 py-1 text-[8px] text-slate-600">ESC</button></div><div className="max-h-[420px] overflow-y-auto p-2">{modules.map((module) => <button key={module.id} onClick={() => onSelect(module)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/[.04]"><span className="grid size-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Code2 size={14} /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-slate-300">{module.label}</span><span className="mt-0.5 block truncate font-mono text-[8px] text-slate-600">{module.path}</span></span><span className="rounded bg-white/[.04] px-2 py-1 text-[8px] text-slate-600">{module.kind}</span></button>)}{!modules.length && <p className="p-8 text-center text-[10px] text-slate-600">No modules match that search.</p>}</div></div></div>;
}

function Metric({ icon: Icon, label, value, suffix, trend, color }: { icon: typeof Boxes; label: string; value: string; suffix?: string; trend: string; color: string }) {
  const colors: Record<string, string> = { violet: "bg-violet-400/10 text-violet-300", cyan: "bg-cyan-400/10 text-cyan-300", amber: "bg-amber-400/10 text-amber-300", emerald: "bg-emerald-400/10 text-emerald-300" };
  return <div className="holo-panel rounded-xl border border-violet-400/10 p-3"><div className="flex items-center gap-3"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", colors[color])}><Icon size={15} /></span><div className="min-w-0"><div className="flex items-baseline gap-1"><span className="text-lg font-semibold tracking-tight text-slate-100">{value}</span>{suffix && <span className="text-[9px] text-slate-500">{suffix}</span>}</div><p className="text-[9px] text-slate-500">{label}</p></div><span className="ml-auto hidden truncate text-right text-[8px] text-slate-500 sm:block">{trend}</span></div></div>;
}

function ModuleDetails({ module, snapshot, impact, onSelect, onAsk }: { module: CodeModule; snapshot: GraphSnapshot; impact: ReturnType<typeof calculateImpact>; onSelect: (module: CodeModule) => void; onAsk: () => void }) {
  const consumers = snapshot.edges.filter((edge) => edge.target === module.id).map((edge) => snapshot.modules.find((item) => item.id === edge.source)).filter(Boolean) as CodeModule[];
  const dependencies = snapshot.edges.filter((edge) => edge.source === module.id).map((edge) => snapshot.modules.find((item) => item.id === edge.target)).filter(Boolean) as CodeModule[];
  return <div className="flex-1 overflow-y-auto p-4"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><GitFork size={16} /></span><div className="min-w-0"><h3 className="truncate text-[12px] font-semibold text-slate-100">{module.label}</h3><p className="mt-1 break-all font-mono text-[8px] leading-relaxed text-slate-600">{module.path}</p></div></div><div className="mt-5 grid grid-cols-3 gap-2">{[["LOC", module.loc ?? 0], ["Imports", module.imports], ["Used by", module.importedBy]].map(([label, value]) => <div key={label} className="rounded-lg bg-white/[.025] p-2 text-center"><p className="text-[12px] font-semibold text-slate-200">{value}</p><p className="mt-0.5 text-[8px] text-slate-600">{label}</p></div>)}</div><div className="mt-5 flex items-center justify-between"><span className="text-[9px] font-medium uppercase tracking-wider text-slate-600">Change impact</span><span className={cn("rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase", impact.risk === "low" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-300")}>{impact.risk}</span></div><div className="mt-2 rounded-lg border border-white/[.06] bg-white/[.02] p-3"><p className="text-[11px] font-medium text-slate-300">{impact.affected.length} modules affected</p><p className="mt-1 text-[9px] leading-relaxed text-slate-600">Calculated from verified reverse dependency paths.</p></div><RelationList title="Depends on" items={dependencies} onSelect={onSelect} /><RelationList title="Imported by" items={consumers} onSelect={onSelect} /><button onClick={onAsk} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[.07] py-2.5 text-[9px] font-medium text-violet-300 hover:bg-violet-400/10"><Bot size={13} />Investigate this module<ArrowRight size={11} /></button></div>;
}

function RelationList({ title, items, onSelect }: { title: string; items: CodeModule[]; onSelect: (module: CodeModule) => void }) {
  return <div className="mt-5"><p className="text-[9px] font-medium uppercase tracking-wider text-slate-600">{title} · {items.length}</p><div className="mt-2 space-y-1.5">{items.slice(0, 4).map((item) => <button key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center gap-2 rounded-lg bg-white/[.025] px-2.5 py-2 text-left hover:bg-white/[.05]"><span className="size-1.5 rounded-full bg-violet-400/60" /><span className="min-w-0 flex-1 truncate font-mono text-[8px] text-slate-500">{item.path}</span><ArrowRight size={9} className="text-slate-700" /></button>)}{!items.length && <p className="rounded-lg border border-dashed border-white/[.06] py-3 text-center text-[8px] text-slate-700">No relationships</p>}</div></div>;
}

function AgentPanel({ question, setQuestion, asking, answer, askAgent, suggestions, onEvidence }: {
  question: string;
  setQuestion: (value: string) => void;
  asking: boolean;
  answer: InvestigatorAnswer | null;
  askAgent: (prompt?: string) => void;
  suggestions: string[];
  onEvidence?: (path: string) => void;
}) {
  const resultLabel = answer?.status === "error"
    ? "Request failed"
    : answer?.status === "insufficient_evidence"
    ? "Insufficient evidence"
    : answer?.notice ? "Graph fallback" : answer?.mode === "openai" ? "AI + graph" : "Graph calculation";

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-400/10 text-violet-300"><Sparkles size={15} /></span>
      <div><p className="text-[11px] font-medium text-slate-200">Repository investigator</p><p className="text-[8px] text-slate-600">Answers from verified graph evidence</p></div>
    </div>
    <div className="mt-3 rounded-lg border border-cyan-400/10 bg-cyan-400/[.025] px-3 py-2 text-[8px] leading-relaxed text-slate-500">
      Scope: dependency paths, import direction, cycles, and blast radius. Source-code behavior is not inspected.
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite" aria-busy={asking}>
      {!answer && !asking && <div className="mt-5"><p className="text-[9px] text-slate-500">Try asking</p><div className="mt-2 space-y-1.5">{suggestions.map((item) => <button key={item} onClick={() => askAgent(item)} className="w-full rounded-lg border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-left text-[9px] leading-relaxed text-slate-400 hover:border-violet-400/20 hover:text-slate-200">{item}</button>)}</div></div>}
      {asking && <div className="mt-8 flex flex-col items-center text-center"><Loader2 size={20} className="animate-spin text-violet-400" /><p className="mt-3 text-[10px] text-slate-400">Tracing verified dependency paths…</p><p className="mt-1 text-[8px] text-slate-600">No source code is executed</p></div>}
      {answer && !asking && <div className={cn("mt-5 rounded-xl border p-3.5", answer.status === "error" ? "border-rose-400/20 bg-rose-400/[.05]" : answer.status === "insufficient_evidence" ? "border-amber-400/15 bg-amber-400/[.04]" : "border-violet-400/10 bg-violet-400/[.04]")}>
        <div className="flex items-center justify-between"><span className={cn("text-[8px] font-semibold uppercase tracking-wider", answer.status === "error" ? "text-rose-300" : answer.status === "insufficient_evidence" ? "text-amber-300" : "text-violet-400")}>{answer.status === "error" ? "Investigation unavailable" : "Investigation"}</span><span className="rounded bg-white/[.04] px-1.5 py-0.5 text-[7px] uppercase text-slate-500">{resultLabel}</span></div>
        <p className="mt-3 text-[10px] leading-[1.7] text-slate-300">{answer.text}</p>
        {answer.notice && <p className="mt-3 rounded-lg border border-cyan-400/10 bg-cyan-400/[.035] px-2.5 py-2 text-[8px] leading-relaxed text-cyan-200/75">{answer.notice}</p>}
        {answer.evidence.length > 0 && <div className="mt-3 border-t border-white/[.06] pt-3"><p className="text-[8px] uppercase tracking-wider text-slate-500">Verified snapshot paths</p>{answer.evidence.map((item) => <button key={item} type="button" onClick={() => onEvidence?.(item)} disabled={!onEvidence} className="mt-1.5 flex w-full items-center gap-1 truncate text-left font-mono text-[8px] text-cyan-400/70 enabled:hover:text-cyan-300 disabled:cursor-default"><span>↳</span><span className="truncate">{item}</span></button>)}</div>}
        {answer.status === "error" && <button type="button" onClick={() => askAgent(question)} className="mt-3 rounded-lg border border-rose-300/20 px-3 py-2 text-[8px] font-semibold text-rose-200 transition hover:bg-rose-400/10">Retry investigation</button>}
      </div>}
    </div>
    <div className="shrink-0 border-t border-white/[.06] pt-3"><div className="flex items-end rounded-xl border border-white/[.09] bg-black/15 p-2 focus-within:border-violet-400/30"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); askAgent(); } }} rows={2} placeholder="Ask about architecture or impact…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-[10px] text-slate-200 outline-none placeholder:text-slate-600" /><button onClick={() => askAgent()} aria-label="Run investigation" disabled={!question.trim() || asking} className="grid size-8 place-items-center rounded-lg bg-violet-600 text-[var(--accent-contrast)] disabled:bg-slate-800 disabled:text-slate-600"><Send size={12} /></button></div><p className="mt-2 text-center text-[7px] text-slate-600">Grounded in the current immutable snapshot</p></div>
  </div>;
}
