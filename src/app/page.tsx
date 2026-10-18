import Link from "next/link";
import { ArrowRight, Bot, GitBranch, LockKeyhole, Network, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";

const features = [
  { icon: Network, title: "Verified dependency graphs", text: "Parse imports, re-exports, dynamic imports, and require calls into navigable architecture." },
  { icon: GitBranch, title: "Change-impact analysis", text: "Trace real reverse-dependency paths before a refactor reaches production." },
  { icon: Bot, title: "Grounded investigation", text: "Ask architectural questions with evidence constrained to the current immutable snapshot." },
  { icon: ShieldCheck, title: "Organization isolation", text: "Clerk organizations and Supabase tenant boundaries keep every workspace separated." },
];

export default function LandingPage() {
  const authEnabled = isClerkConfigured();
  return (
    <main className="min-h-screen bg-background text-slate-200">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6"><Logo /><nav className="flex items-center gap-3"><Link href="/pricing" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-foreground">Pricing</Link><ThemeToggle /><Link href={authEnabled ? "/dashboard" : "/sign-in"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-[#fffaf3] hover:bg-violet-500">{authEnabled ? "Open workspace" : "Sign in"}</Link></nav></header>
      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pt-28">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[.06] px-3 py-1.5 text-xs text-violet-300"><Sparkles size={13} /> Code intelligence grounded in real graph evidence</div><h1 className="mt-7 max-w-3xl text-5xl font-semibold tracking-[-.055em] text-foreground sm:text-7xl">Understand the code before you change it.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-400">SynapCode turns public TypeScript and JavaScript repositories into interactive dependency maps, calculates blast radius, and explains architecture without inventing files or edges.</p><div className="mt-9 flex flex-wrap gap-3"><Link href={authEnabled ? "/dashboard" : "/sign-in"} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-[#fffaf3] shadow-[0_16px_50px_rgba(244,111,82,.24)] hover:bg-violet-500">{authEnabled ? "Start analyzing" : "Sign in to SynapCode"} <ArrowRight size={15} /></Link><Link href="/pricing" className="rounded-xl border border-white/10 bg-white/[.03] px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[.06]">View plans</Link></div>{!authEnabled && <div className="mt-5 flex max-w-xl items-start gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[.045] px-4 py-3"><LockKeyhole className="mt-0.5 shrink-0 text-sky-300" size={15} /><div><p className="text-xs font-semibold text-sky-100">Sign-in is temporarily unavailable</p><p className="mt-1 text-xs leading-5 text-slate-500">We’re completing secure account setup. You can still review plans and product capabilities.</p></div></div>}</div>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-panel p-5 shadow-2xl"><div className="absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative rounded-2xl border border-white/[.07] bg-panel-deep p-5"><div className="flex items-center justify-between text-xs text-slate-500"><span>acme/atlas-web</span><span className="rounded-md bg-emerald-400/10 px-2 py-1 text-emerald-300">Verified</span></div><div className="mt-8 grid grid-cols-3 gap-3">{["10 modules", "15 edges", "0 cycles"].map((item) => <div key={item} className="rounded-xl border border-white/[.06] bg-white/[.025] p-4 text-center text-xs text-slate-300">{item}</div>)}</div><div className="mt-5 space-y-3">{["src/app/page.tsx", "src/hooks/use-query.ts", "src/services/api.ts"].map((path, index) => <div key={path} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-4"><span className="grid size-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Network size={14} /></span><span className="font-mono text-xs text-slate-400">{path}</span><span className="ml-auto text-xs text-slate-600">{3 - index} links</span></div>)}</div></div></div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon size={18} /></span><h2 className="mt-5 text-sm font-semibold text-foreground">{title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></article>)}</section>
    </main>
  );
}
