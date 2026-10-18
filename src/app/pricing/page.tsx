import { PricingTable } from "@clerk/nextjs";
import { ArrowRight, Check, CircleDollarSign, Info } from "lucide-react";
import Link from "next/link";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";

const planPreview = [
  {
    name: "Free",
    price: "$0",
    cta: "Start free",
    description: "Learn a repository before changing it.",
    features: ["1 repository", "3 analyses per month", "Dependency and impact graphs", "Deterministic investigator"],
  },
  {
    name: "Pro",
    price: "$19",
    cta: "Choose Pro",
    description: "For developers working across active codebases.",
    featured: true,
    features: ["Unlimited repositories", "Unlimited analyses", "OpenAI investigator", "Persisted snapshot history"],
  },
  {
    name: "Business",
    price: "$49",
    cta: "Choose Business",
    description: "For teams that need shared code intelligence.",
    features: ["Everything in Pro", "Organization workspaces", "Member management", "Team investigation history"],
  },
];

export default function PricingPage() {
  const clerkConfigured = isClerkConfigured();
  const billingEnabled = process.env.CLERK_BILLING_ENABLED === "true";

  return (
    <main className="min-h-screen bg-background px-6 pb-20 text-slate-200">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between">
        <Link href="/"><Logo /></Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <BackToHomeLink />
        </div>
      </header>

      <section className="mx-auto max-w-5xl pt-12 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-400"><CircleDollarSign size={21} /></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-violet-400">Global organization plans · USD billing</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Start free. Upgrade when your codebase grows.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">Built for developers and software teams worldwide. Start with the verified graph for free, then unlock unlimited analysis and AI-assisted investigations for your organization.</p>
      </section>

      {clerkConfigured && billingEnabled ? (
        <section className="mx-auto mt-12 max-w-6xl rounded-3xl border border-white/[.08] bg-panel p-5 sm:p-8">
          <PricingTable
            for="organization"
            highlightedPlan="pro"
            newSubscriptionRedirectUrl="/dashboard"
            ctaPosition="bottom"
          />
        </section>
      ) : (
        <>
          <section className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-3">
            {planPreview.map((plan) => (
              <article key={plan.name} className={`flex min-h-[430px] flex-col rounded-3xl border p-6 ${plan.featured ? "border-violet-400/35 bg-panel shadow-[0_24px_90px_rgba(244,111,82,.14)]" : "border-white/[.08] bg-panel"}`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                  {plan.featured && <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-400">Popular</span>}
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight text-foreground">{plan.price}</span><span className="pb-1 text-xs text-slate-500">USD / month</span></div>
                <div className="my-6 h-px bg-white/[.07]" />
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-slate-400"><Check className="mt-1 shrink-0 text-emerald-400" size={14} />{feature}</li>)}
                </ul>
                <Link
                  href={clerkConfigured ? "/sign-up" : "/sign-in"}
                  className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm font-semibold text-slate-400 transition hover:border-violet-400/30 hover:bg-violet-400/[.08] hover:text-foreground"
                  aria-label={`${plan.cta} plan`}
                >
                  {plan.cta} <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </section>
          <section className="mx-auto mt-6 flex max-w-6xl items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[.045] px-5 py-4">
            <Info size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-6 text-slate-500"><span className="font-semibold text-slate-300">Checkout preview:</span> {clerkConfigured ? "these actions open account setup. Enable Clerk Billing, publish the organization plans, and set CLERK_BILLING_ENABLED=true to replace this preview with subscription checkout." : "these actions open account setup. Add your Clerk keys to this deployment, then enable Clerk Billing and publish the organization plans to activate subscription checkout."}</p>
          </section>
          <p className="mx-auto mt-4 max-w-6xl text-center text-[11px] leading-5 text-slate-500">International prices are billed in USD.</p>
        </>
      )}
    </main>
  );
}
