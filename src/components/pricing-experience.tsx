import Link from "next/link";
import { ArrowRight, Check, CircleDollarSign } from "lucide-react";

export type PricingPlan = {
  name: string;
  price: string;
  cta: string;
  description: string;
  featured?: boolean;
  features: string[];
};

export function PricingHero() {
  return (
    <section className="mx-auto max-w-5xl pt-12 text-center sm:pt-14">
      <div className="relative mx-auto grid size-12 place-items-center rounded-2xl border border-violet-400/20 bg-violet-400/[.08] text-violet-300 shadow-[0_0_36px_rgba(0,242,254,.1)]">
        <CircleDollarSign size={21} aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300">Console access matrix / USD</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-foreground sm:text-5xl lg:text-6xl">Choose the depth of your code intelligence.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500">Begin with a verified repository graph, then expand into unlimited analysis, shared team Consoles, and evidence-grounded investigations.</p>
    </section>
  );
}

export function PricingPreview({ plans, accountHref }: { plans: PricingPlan[]; accountHref: string }) {
  return (
    <section className="mx-auto mt-10 grid max-w-7xl items-stretch gap-5 sm:mt-12 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.name}
          aria-label={`${plan.name}${plan.featured ? " — recommended" : ""}`}
          className={`holo-panel relative flex flex-col overflow-hidden rounded-3xl p-6 transition-[border-color,background-color,box-shadow] duration-200 lg:min-h-[460px] ${plan.featured ? "border-violet-400/30 bg-violet-400/[.025] shadow-[0_22px_70px_rgba(0,5,12,.22)] ring-1 ring-inset ring-violet-400/10" : "shadow-[0_20px_60px_rgba(0,5,12,.18)] hover:border-violet-400/22"}`}
        >
          <div className="relative flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
            {plan.featured && <span className="rounded-full border border-violet-400/25 bg-violet-400/[.07] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-violet-300">Recommended</span>}
          </div>
          <p className="relative mt-3 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
          <div className="relative mt-5 flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight text-foreground">{plan.price}</span><span className="pb-1 text-xs text-slate-500">USD / month</span></div>
          <div className="relative my-6 h-px bg-white/[.07]" />
          <ul className="relative flex-1 space-y-3">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm leading-6 text-slate-400"
              >
                <Check className="mt-1 shrink-0 text-emerald-400" size={14} />{feature}
              </li>
            ))}
          </ul>
          <div className="relative mt-7">
            <Link
              href={accountHref}
              data-plan-cta="true"
              className="group/cta flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.055] px-4 py-3 text-sm font-semibold text-slate-200 shadow-[inset_0_1px_rgba(255,255,255,.03)] transition-[background-color,border-color,color,box-shadow] hover:border-violet-400/40 hover:bg-violet-400/[.1] hover:text-foreground hover:shadow-[0_10px_30px_rgba(0,242,254,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`${plan.cta} plan`}
            >
              {plan.cta} <ArrowRight className="transition-transform group-hover/cta:translate-x-0.5" size={14} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
