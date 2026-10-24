import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { Logo } from "@/components/logo";
import { PricingHero, PricingPreview } from "@/components/pricing-experience";
import { PricingReturnLink } from "@/components/pricing-return-link";
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
    features: ["Everything in Pro", "Team Consoles", "Member management", "Team investigation history"],
  },
];

export default function PricingPage() {
  const clerkConfigured = isClerkConfigured();
  const billingEnabled = process.env.CLERK_BILLING_ENABLED === "true";

  return (
    <main className="spatial-shell min-h-screen px-6 pb-16 text-slate-200">
      <header className="sticky top-0 z-50 -mx-6 border-b border-violet-400/[.08] bg-background/[.72] backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Suspense fallback={<BackToHomeLink />}>
              <PricingReturnLink />
            </Suspense>
          </div>
        </div>
      </header>

      <PricingHero />

      {clerkConfigured && billingEnabled ? (
        <section className="holo-panel mx-auto mt-12 max-w-7xl rounded-3xl p-5 sm:p-8">
          <PricingTable
            for="organization"
            highlightedPlan="pro"
            newSubscriptionRedirectUrl="/dashboard"
            ctaPosition="bottom"
          />
        </section>
      ) : (
        <PricingPreview plans={planPreview} accountHref={clerkConfigured ? "/sign-up" : "/sign-in"} />
      )}
    </main>
  );
}
