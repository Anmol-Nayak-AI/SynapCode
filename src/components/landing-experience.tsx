"use client";

import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Database,
  Fingerprint,
  GitBranch,
  History,
  LockKeyhole,
  Network,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const capabilities = [
  {
    id: "graph",
    icon: Network,
    eyebrow: "Architecture map",
    title: "Navigate a verified dependency graph",
    summary: "Inspect resolved imports, reverse dependencies, and cycles from one immutable repository snapshot.",
    resultLabel: "Graph status",
    result: "7 paths verified",
    previewRows: [
      { name: "src/app/page.tsx", detail: "3 imports", status: "Interface" },
      { name: "src/services/api.ts", detail: "used by 3", status: "Core" },
      { name: "src/lib/auth.ts", detail: "used by 2", status: "Systems" },
    ],
    proofs: ["Alias-aware", "Cycles checked", "Commit locked"],
  },
  {
    id: "impact",
    icon: GitBranch,
    eyebrow: "Impact trace",
    title: "See the blast radius before editing",
    summary: "Select a module and follow every verified downstream path that could be affected by a change.",
    resultLabel: "Downstream reach",
    result: "4 modules affected",
    previewRows: [
      { name: "src/services/api.ts", detail: "selected", status: "Origin" },
      { name: "src/hooks/use-query.ts", detail: "1 hop", status: "Affected" },
      { name: "src/app/dashboard.tsx", detail: "2 hops", status: "Affected" },
    ],
    proofs: ["Reverse paths", "Hop distance", "No guessed edges"],
  },
  {
    id: "investigate",
    icon: Bot,
    eyebrow: "Evidence-backed answers",
    title: "Investigate architecture with citations",
    summary: "Ask questions against the current graph and keep every explanation tied to real modules and paths.",
    resultLabel: "Answer mode",
    result: "Evidence grounded",
    previewRows: [
      { name: "What changes if API Client moves?", detail: "question", status: "Query" },
      { name: "3 downstream consumers", detail: "graph evidence", status: "Finding" },
      { name: "src/services/api.ts", detail: "source module", status: "Citation" },
    ],
    proofs: ["Snapshot scoped", "Path citations", "Deterministic first"],
  },
  {
    id: "isolation",
    icon: ShieldCheck,
    eyebrow: "Enterprise boundary",
    title: "Keep every organization isolated",
    summary: "Scope repositories, snapshots, members, and investigations to the active organization boundary.",
    resultLabel: "Access boundary",
    result: "Organization scoped",
    previewRows: [
      { name: "Active organization", detail: "required", status: "Identity" },
      { name: "Repository snapshot", detail: "tenant bound", status: "Data" },
      { name: "Investigation history", detail: "tenant bound", status: "Audit" },
    ],
    proofs: ["Role aware", "Tenant scoped", "Server enforced"],
  },
];

const workflowSteps = [
  {
    icon: ScanSearch,
    tag: "01 / INGEST",
    title: "Map the repository",
    text: "Bounded GitHub ingestion reads source text without cloning or executing repository code.",
    outcome: "Source mapped",
  },
  {
    icon: Boxes,
    tag: "02 / VERIFY",
    title: "Build the evidence graph",
    text: "AST parsing resolves imports, aliases, re-exports, cycles, and reverse-dependency paths.",
    outcome: "Graph verified",
  },
  {
    icon: Radar,
    tag: "03 / INVESTIGATE",
    title: "Trace before changing",
    text: "Explore blast radius and ask questions against the exact immutable commit snapshot.",
    outcome: "Impact traced",
  },
];

const controls = [
  { icon: Fingerprint, title: "Tenant boundaries", text: "Organization-scoped authorization and row-level security." },
  { icon: History, title: "Immutable context", text: "Every investigation stays attached to its source snapshot." },
  { icon: CheckCircle2, title: "Evidence paths", text: "Answers connect back to real modules and graph relationships." },
  { icon: Zap, title: "Durable analysis", text: "Retryable jobs, persisted status, and resumable Console polling." },
];

const layers = [
  { name: "Interface", color: "var(--secondary-400)" },
  { name: "Core", color: "var(--accent-400)" },
  { name: "Systems", color: "var(--fresh-400)" },
] as const;

type CodeMapModule = {
  id: string;
  label: string;
  role: string;
  signal: string;
  position: [number, number];
  layer: number;
  color: string;
};

const codeModules: CodeMapModule[] = [
  { id: "shell", label: "UI Shell", role: "Interface boundary", signal: "6 dependents", position: [16, 26], layer: 0, color: "var(--secondary-400)" },
  { id: "routes", label: "Route Layer", role: "Request entry points", signal: "9 edges", position: [16, 72], layer: 0, color: "var(--secondary-400)" },
  { id: "graph", label: "Graph Engine", role: "Dependency topology", signal: "18 reverse paths", position: [50, 49], layer: 1, color: "var(--accent-400)" },
  { id: "impact", label: "Impact Core", role: "Blast-radius tracing", signal: "4 affected modules", position: [50, 82], layer: 1, color: "var(--accent-400)" },
  { id: "agent", label: "Agent Runtime", role: "Grounded investigation", signal: "12 evidence links", position: [50, 16], layer: 1, color: "var(--accent-400)" },
  { id: "jobs", label: "Analysis Jobs", role: "Durable orchestration", signal: "3 active stages", position: [84, 27], layer: 2, color: "var(--fresh-400)" },
  { id: "store", label: "Snapshot Store", role: "Immutable graph state", signal: "Commit locked", position: [84, 72], layer: 2, color: "var(--fresh-400)" },
];

const codeLinks: Array<{ from: number; to: number }> = [
  { from: 0, to: 2 },
  { from: 1, to: 2 },
  { from: 2, to: 4 },
  { from: 2, to: 3 },
  { from: 4, to: 5 },
  { from: 3, to: 6 },
  { from: 5, to: 6 },
];

function ArchitectureVisual() {
  const reduceMotion = Boolean(useReducedMotion());
  const [selectedModule, setSelectedModule] = useState(2);
  const selected = codeModules[selectedModule];

  return (
    <motion.aside
      className="holo-panel relative min-h-[590px] overflow-hidden rounded-[28px] shadow-[0_32px_100px_rgba(0,10,20,.22)] sm:min-h-[520px]"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: reduceMotion ? 1 : 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.78, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Interactive code topology showing repository modules and verified dependency paths"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_8%,color-mix(in_srgb,var(--accent-400)_9%,transparent),transparent_32%),radial-gradient(circle_at_12%_92%,color-mix(in_srgb,var(--secondary-400)_7%,transparent),transparent_34%)]" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/[.08] px-6 py-4">
        <div><p className="font-mono text-[8px] font-semibold uppercase tracking-[.18em] text-slate-500">Dependency intelligence</p><p className="mt-1 text-sm font-semibold text-foreground">Repository architecture</p></div>
        <div className="flex items-center gap-3"><span className="hidden font-mono text-[8px] text-slate-600 sm:inline">Current snapshot</span><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[.08em] text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" /> Verified</span></div>
      </div>

      <div className="absolute inset-x-5 bottom-[82px] top-[76px] z-10 overflow-hidden rounded-2xl border border-white/[.08] bg-panel-deep/55 shadow-[inset_0_1px_rgba(255,255,255,.035)]">
          <div className="absolute inset-x-0 top-0 grid grid-cols-3 border-b border-white/[.07] bg-panel/72">
            {layers.map((layer, index) => <div key={layer.name} className={`flex items-center gap-2 px-4 py-3 ${index > 0 ? "border-l border-white/[.06]" : ""}`}><span className="size-1.5 rounded-full" style={{ backgroundColor: layer.color }} /><span className="font-mono text-[8px] font-semibold uppercase tracking-[.14em] text-slate-500">{layer.name}</span></div>)}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-1/3 top-[41px] w-px bg-white/[.055]" />
          <div className="pointer-events-none absolute bottom-0 left-2/3 top-[41px] w-px bg-white/[.055]" />
          <svg className="absolute inset-x-5 bottom-5 top-[52px] h-[calc(100%_-_4.5rem)] w-[calc(100%_-_2.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="dependency-edge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--secondary-400)" stopOpacity=".52" />
                <stop offset="1" stopColor="var(--accent-400)" stopOpacity=".3" />
              </linearGradient>
              <marker id="dependency-arrow" markerWidth="4" markerHeight="4" refX="3.4" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 Z" fill="var(--tone-400)" fillOpacity=".8" />
              </marker>
            </defs>
            {codeLinks.map(({ from, to }) => {
              const source = codeModules[from];
              const target = codeModules[to];
              const highlighted = from === selectedModule || to === selectedModule;
              return <line key={`${source.id}-${target.id}`} x1={source.position[0]} y1={source.position[1]} x2={target.position[0]} y2={target.position[1]} vectorEffect="non-scaling-stroke" markerEnd="url(#dependency-arrow)" stroke={highlighted ? "var(--foreground)" : "url(#dependency-edge)"} strokeWidth={highlighted ? 1.35 : 1} strokeOpacity={highlighted ? 0.62 : 0.28} className="transition-all duration-200" />;
            })}
          </svg>
          <div className="absolute inset-x-5 bottom-5 top-[52px]">
            {codeModules.map((module, index) => {
              const isSelected = selectedModule === index;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModule(index)}
                  aria-pressed={isSelected}
                  className={`group absolute w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 sm:w-[126px] ${isSelected ? "border-violet-400/45 bg-panel shadow-[0_10px_30px_rgba(0,0,0,.12)] ring-2 ring-violet-400/10" : "border-transparent bg-transparent hover:border-white/10 hover:bg-panel/65"}`}
                  style={{ left: `${module.position[0]}%`, top: `${module.position[1]}%` }}
                >
                  <span className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/10 bg-panel"><span className="size-1.5 rounded-full" style={{ backgroundColor: module.color, boxShadow: isSelected ? `0 0 9px ${module.color}` : "none" }} /></span><span className="whitespace-nowrap text-[9px] font-semibold text-foreground sm:text-[10px]">{module.label}</span></span>
                  <span className="mt-1.5 block pl-7 text-[7px] leading-3 text-slate-500 sm:text-[8px]">{module.role}</span>
                </button>
              );
            })}
          </div>
      </div>
      <div className="absolute inset-x-5 bottom-4 z-10 flex h-[54px] items-center justify-between rounded-2xl border border-white/[.08] bg-panel/68 px-4">
        <div className="min-w-0"><p className="font-mono text-[7px] uppercase tracking-[.14em] text-slate-600">Selected module</p><div className="mt-1 flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} /><span className="truncate text-[10px] font-semibold text-foreground">{selected.label}</span><span className="hidden text-[9px] text-slate-500 sm:inline">{selected.role}</span></div></div>
        <div className="flex items-center gap-5 text-right"><div><p className="font-mono text-[7px] uppercase tracking-[.12em] text-slate-600">Evidence</p><p className="mt-1 font-mono text-[9px] text-emerald-300">{selected.signal}</p></div><div className="hidden sm:block"><p className="font-mono text-[7px] uppercase tracking-[.12em] text-slate-600">Paths</p><p className="mt-1 font-mono text-[9px] text-slate-300">{codeLinks.length} verified</p></div></div>
      </div>
    </motion.aside>
  );
}

const revealContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const revealItem = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const } } };

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <div className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300"><span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_currentColor]" />{children}</div>;
}

function CapabilityWorkbench({ highlighted = false }: { highlighted?: boolean }) {
  const [activeCapability, setActiveCapability] = useState(0);
  const selected = capabilities[activeCapability];

  return (
    <motion.div
      variants={revealItem}
      className={`holo-panel relative grid overflow-hidden rounded-[30px] transition-[box-shadow] duration-500 lg:grid-cols-[.72fr_1.28fr] ${highlighted ? "shadow-[0_0_0_1px_rgba(167,139,250,.6),0_36px_120px_rgba(0,242,254,.18),inset_0_0_0_1px_rgba(255,255,255,.04)]" : "shadow-[0_36px_110px_rgba(0,8,18,.34),inset_0_0_0_1px_rgba(255,255,255,.018)]"}`}
    >
      <div className="relative z-10 border-b border-white/[.08] bg-panel-deep/55 p-3 lg:border-b-0 lg:border-r lg:p-4">
        <div className="px-3 pb-3 pt-2">
          <p className="font-mono text-[8px] font-semibold uppercase tracking-[.18em] text-slate-600">Select a capability</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">The preview updates immediately—no modal and no page jump.</p>
        </div>
        <div role="tablist" aria-label="Product capabilities" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {capabilities.map(({ id, icon: Icon, eyebrow, title }, index) => {
            const isActive = index === activeCapability;
            return (
              <button
                key={id}
                id={`capability-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`capability-panel-${id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveCapability(index)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
                  const next = (index + direction + capabilities.length) % capabilities.length;
                  setActiveCapability(next);
                  document.getElementById(`capability-tab-${capabilities[next].id}`)?.focus();
                }}
                className={`group relative flex min-h-[88px] items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${isActive ? "border-violet-400/35 bg-violet-400/[.08] text-foreground shadow-[0_12px_38px_rgba(0,0,0,.16)]" : "border-transparent text-slate-400 hover:border-white/[.08] hover:bg-white/[.025] hover:text-slate-200"}`}
              >
                {isActive && <motion.span layoutId="active-capability" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-violet-400 shadow-[0_0_14px_currentColor]" />}
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${isActive ? "border-violet-400/25 bg-violet-400/[.1] text-violet-300" : "border-white/[.08] bg-white/[.02] text-slate-500 group-hover:text-violet-300"}`}><Icon size={18} /></span>
                <span className="min-w-0"><span className="block font-mono text-[7px] font-semibold uppercase tracking-[.16em] text-slate-600">{eyebrow}</span><span className="mt-1.5 block text-xs font-semibold leading-5">{title}</span></span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 min-h-[520px] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/[.1] blur-3xl" />
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            id={`capability-panel-${selected.id}`}
            role="tabpanel"
            aria-labelledby={`capability-tab-${selected.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full min-h-[470px] flex-col"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.08] pb-5">
              <div className="max-w-lg">
                <div className="flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[.17em] text-violet-300"><span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_currentColor]" />Interactive product preview</div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-.035em] text-foreground sm:text-3xl">{selected.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{selected.summary}</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[.12em] text-emerald-300">Live preview</span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-panel-deep/65">
              <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3">
                <span className="font-mono text-[8px] uppercase tracking-[.15em] text-slate-600">Illustrative repository state</span>
                <span className="font-mono text-[8px] text-slate-600">atlas-web / main</span>
              </div>
              <div className="divide-y divide-white/[.06]">
                {selected.previewRows.map((row, index) => (
                  <motion.div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:grid-cols-[1fr_auto_auto]" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + index * 0.05 }}>
                    <div className="flex min-w-0 items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg border border-violet-400/15 bg-violet-400/[.06]"><span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_9px_currentColor]" /></span><span className="truncate font-mono text-[10px] text-slate-300">{row.name}</span></div>
                    <span className="hidden font-mono text-[8px] text-slate-600 sm:block">{row.detail}</span>
                    <span className="rounded-full border border-white/[.08] bg-white/[.025] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[.1em] text-slate-500">{row.status}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selected.proofs.map((proof) => <span key={proof} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 font-mono text-[8px] text-slate-500"><CheckCircle2 size={10} className="text-emerald-300" />{proof}</span>)}
            </div>

            <div className="mt-auto flex flex-col gap-4 border-t border-white/[.08] pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="font-mono text-[7px] uppercase tracking-[.16em] text-slate-600">{selected.resultLabel}</p><p className="mt-1.5 font-mono text-[11px] text-emerald-300">{selected.result}</p></div>
              <Link href="#workflow" className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/[.1] px-4 py-2.5 text-xs font-semibold text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-400/[.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">See the workflow <ArrowRight size={13} /></Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function LandingExperience({ authEnabled }: { authEnabled: boolean }) {
  const reduceMotion = Boolean(useReducedMotion());
  const [productTourActive, setProductTourActive] = useState(false);

  const exploreProduct = () => {
    const productSection = document.getElementById("product");
    if (!productSection) return;

    setProductTourActive(true);
    if (window.location.hash !== "#product") window.history.pushState(null, "", "#product");
    productSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    document.getElementById("capability-tab-graph")?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative isolate mx-auto grid max-w-7xl gap-14 overflow-hidden px-6 pb-10 pt-10 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:overflow-visible lg:pb-12 lg:pt-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[650px] overflow-hidden" aria-hidden="true">
          <motion.div className="absolute -left-32 top-28 size-80 rounded-full bg-violet-500/[.09] blur-3xl" animate={{ x: [0, 42, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute -right-20 top-4 size-96 rounded-full bg-emerald-400/[.06] blur-3xl" animate={{ x: [0, -34, 0], y: [0, 28, 0], scale: [1.04, 0.96, 1.04] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <motion.div className="relative z-10" variants={revealContainer} initial="hidden" animate="visible">
          <motion.div variants={revealItem} className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[.055] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-violet-300 shadow-[0_0_34px_rgba(0,242,254,.07)]"><Sparkles size={13} /> Verified repository intelligence</motion.div>
          <motion.h1 variants={revealItem} className="mt-7 max-w-3xl text-5xl font-semibold leading-[.96] tracking-[-.06em] text-foreground sm:text-7xl">Understand every dependency <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">before you change the code.</span></motion.h1>
          <motion.p variants={revealItem} className="mt-7 max-w-xl text-base leading-8 text-slate-400">SynapCode transforms TypeScript and JavaScript repositories into evidence-backed architecture maps. Explore dependencies, trace change impact, and investigate with confidence.</motion.p>
          <motion.div variants={revealItem} className="mt-8 flex flex-wrap gap-3">
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}><button type="button" onClick={exploreProduct} aria-controls="product" className="flex items-center gap-2 rounded-xl border border-violet-300/25 bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_16px_54px_rgba(0,242,254,.2)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">Explore the product <ArrowRight size={15} /></button></motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}><Link href="#workflow" className="block rounded-xl border border-white/10 bg-white/[.03] px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[.06]">See the workflow</Link></motion.div>
          </motion.div>
          {!authEnabled && <motion.div variants={revealItem} className="mt-5 flex max-w-xl items-start gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[.045] px-4 py-3"><LockKeyhole className="mt-0.5 shrink-0 text-sky-300" size={15} /><div><p className="text-xs font-semibold text-sky-100">Sign-in is temporarily unavailable</p><p className="mt-1 text-xs leading-5 text-slate-500">We’re completing secure account setup. You can still explore the product and review plans.</p></div></motion.div>}
        </motion.div>
        <ArchitectureVisual />
      </section>

      <motion.section id="product" tabIndex={-1} className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-12 pt-10 outline-none lg:pt-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={revealContainer}>
        <motion.div variants={revealItem} className="mb-10 grid gap-5 md:grid-cols-[.85fr_1.15fr] md:items-end"><div><SectionEyebrow>Product workbench</SectionEyebrow><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] text-foreground sm:text-5xl">Explore what each capability actually does.</h2></div><p className="max-w-xl text-sm leading-7 text-slate-400 md:justify-self-end">Choose a capability to inspect a concrete repository state, its evidence, and the result SynapCode returns.</p></motion.div>
        <CapabilityWorkbench highlighted={productTourActive} />
      </motion.section>

      <section id="workflow" className="relative scroll-mt-24 overflow-hidden border-y border-white/[.06] bg-panel-deep/45 py-14 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,254,.08),transparent_36rem)]" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div className="mx-auto max-w-2xl text-center" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}><SectionEyebrow>From source to signal</SectionEyebrow><h2 className="mt-5 text-3xl font-semibold tracking-[-.045em] text-foreground sm:text-5xl">Three moves from repository to clarity.</h2><p className="mt-5 text-sm leading-7 text-slate-400">A deterministic analysis path first. AI explanation only after the graph establishes the facts.</p></motion.div>
          <motion.div className="relative mt-12 grid gap-5 lg:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealContainer}>
            <motion.div aria-hidden="true" className="absolute left-[15%] right-[15%] top-[42px] hidden h-px origin-left bg-gradient-to-r from-violet-400/20 via-violet-400/80 to-emerald-400/30 lg:block" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.2 }} />
            {workflowSteps.map(({ icon: Icon, tag, title, text, outcome }, index) => (
              <motion.article
                key={title}
                id={`workflow-${index === 0 ? "ingest" : index === 1 ? "verify" : "investigate"}`}
                variants={revealItem}
                className="holo-panel relative flex h-full min-h-[290px] w-full flex-col rounded-[26px] p-7 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,.018)]"
              >
                  <div className="relative z-10 grid size-12 place-items-center rounded-2xl border border-violet-400/20 bg-panel text-violet-300 shadow-[0_0_34px_rgba(0,242,254,.12)]"><Icon size={20} /></div>
                  <p className="mt-8 font-mono text-[9px] font-semibold tracking-[.18em] text-violet-300">{tag}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-.025em] text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{text}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 font-mono text-[8px] uppercase tracking-[.12em] text-emerald-300"><CheckCircle2 size={12} />{outcome}</span>
                  <span className="absolute right-6 top-6 font-mono text-4xl font-semibold text-white/[.025]">{index + 1}</span>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="security" className="mx-auto grid max-w-7xl scroll-mt-24 gap-12 px-6 py-14 sm:py-16 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}><SectionEyebrow>Enterprise foundations</SectionEyebrow><h2 className="mt-5 text-3xl font-semibold tracking-[-.045em] text-foreground sm:text-5xl">Controls designed for production teams.</h2><p className="mt-6 max-w-xl text-sm leading-7 text-slate-400">Keep repository analysis isolated by organization, tied to immutable snapshots, and grounded in traceable evidence.</p></motion.div>
        <motion.div className="holo-panel scan-beam relative overflow-hidden rounded-[30px] bg-[#030812]/85 p-5 shadow-[0_35px_110px_rgba(0,8,18,.42),inset_0_0_0_1px_rgba(255,255,255,.018)] sm:p-7" initial={{ opacity: 0, x: 24, scale: 0.98 }} whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}>
          <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex items-center justify-between border-b border-white/[.08] pb-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><ShieldCheck size={17} /></span><div><p className="text-xs font-semibold text-foreground">Console controls</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[.16em] text-slate-500">Architecture evidence layer</p></div></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.1em] text-emerald-300">Ready</span></div>
          <div className="relative mt-4 grid gap-3 sm:grid-cols-2">{controls.map(({ icon: Icon, title, text }, index) => <motion.div key={title} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.18 + index * 0.07, duration: 0.45 }}><Icon className="text-violet-300" size={16} /><p className="mt-4 text-xs font-semibold text-foreground">{title}</p><p className="mt-2 text-[10px] leading-5 text-slate-500">{text}</p></motion.div>)}</div>
          <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[.035] px-4 py-3 font-mono text-[9px] text-slate-500"><Database size={14} className="shrink-0 text-emerald-300" /><span className="text-emerald-300">snapshot.locked</span><span className="text-slate-600">→</span>graph evidence available for investigation</div>
        </motion.div>
      </section>

      <footer className="border-t border-white/[.06] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold tracking-[-.02em] text-slate-400">Synap<span className="text-violet-400">Code</span></span>
          <span className="text-slate-600">Repository intelligence for safer code changes.</span>
        </div>
      </footer>

    </MotionConfig>
  );
}
