import { ArrowRight, Braces, GitBranch, Network, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthStage } from "@/components/auth-stage";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPortal({ mode, children }: { mode: "sign-in" | "sign-up"; children: ReactNode }) {
  const signingIn = mode === "sign-in";
  return (
    <main className="spatial-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-violet-400/[.1] bg-panel-deep/90 shadow-[0_10px_40px_rgba(0,0,0,.14)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Back to SynapCode homepage" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-4 focus-visible:ring-offset-background"><Logo /></Link>
          <div className="flex items-center gap-2"><ThemeToggle compact /><BackToHomeLink /></div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-4 py-10 sm:px-6 lg:py-14">
        <AuthStage framed={false}>
          <section className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.045] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.15em] text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_var(--fresh-400)]" />Secure Console access</div>
              <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-.055em] text-slate-50">{signingIn ? "Return to your code intelligence Console." : "Build with the full system in view."}</h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">{signingIn ? "Continue mapping dependencies, validating change impact, and investigating architecture with evidence tied to your repository." : "Create a protected Console for verified dependency graphs, impact analysis, and evidence-grounded investigations."}</p>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <Signal icon={Network} label="Graph" value="Verified" />
                <Signal icon={GitBranch} label="Paths" value="Traceable" />
                <Signal icon={ShieldCheck} label="Access" value="Isolated" />
              </div>
              <div className="mt-8 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.14em] text-slate-600"><Braces size={14} className="text-violet-400" />Repository context stays attached to every answer</div>
            </div>

            <div className="holo-panel overflow-hidden rounded-[26px] p-1 shadow-[0_30px_110px_rgba(0,0,0,.38),inset_0_0_0_1px_rgba(255,255,255,.018)]">
              <div className="relative z-[1] rounded-[21px] border border-white/[.055] bg-panel-deep/80 p-6 sm:p-8">
                <div className="mb-7 flex items-center justify-between border-b border-white/[.07] pb-4"><div><p className="font-mono text-[8px] uppercase tracking-[.18em] text-violet-400">Identity gateway</p><p className="mt-1 text-[10px] text-slate-600">Encrypted session · organization scoped</p></div><span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[.05] px-2 py-1 text-[7px] font-semibold uppercase tracking-[.13em] text-emerald-400"><i className="size-1 rounded-full bg-emerald-400" />Online</span></div>
                <div className="synapcode-auth">{children}</div>
                <div className="mt-6 border-t border-white/[.07] pt-5 text-center text-[10px] text-slate-500">
                  {signingIn ? "New to SynapCode?" : "Already have an account?"}{" "}
                  <Link href={signingIn ? "/sign-up" : "/sign-in"} className="inline-flex items-center gap-1 font-semibold text-violet-300 transition hover:text-violet-400">{signingIn ? "Create an account" : "Sign in"}<ArrowRight size={11} /></Link>
                </div>
              </div>
            </div>
          </section>
        </AuthStage>
      </div>
    </main>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><Icon size={14} className="text-violet-400" /><p className="mt-5 font-mono text-[8px] uppercase tracking-[.14em] text-slate-600">{label}</p><p className="mt-1 text-[10px] font-medium text-slate-300">{value}</p></div>;
}
