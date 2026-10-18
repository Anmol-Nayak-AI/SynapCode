import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";

// Clerk's authentication component reads the current request URL.
export const instant = false;

export default function SignUpPage() {
  const enabled = isClerkConfigured();
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="fixed right-4 top-4 z-10 flex items-center gap-3 sm:right-6 sm:top-6">
        <ThemeToggle />
        <BackToHomeLink />
      </div>
      <div className="flex flex-col items-center gap-6">
        <Link href="/" aria-label="Back to SynapCode homepage" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-4 focus-visible:ring-offset-background">
          <Logo />
        </Link>
        {enabled ? <Suspense fallback={<div className="h-80 w-96 max-w-[calc(100vw-3rem)] animate-pulse rounded-2xl border border-white/10 bg-panel" />}><SignUp fallbackRedirectUrl="/start" signInUrl="/sign-in" /></Suspense> : <div className="max-w-md rounded-2xl border border-sky-400/15 bg-sky-400/[.045] p-6 text-center"><p className="font-semibold text-sky-100">Account creation is not configured</p><p className="mt-2 text-sm leading-6 text-slate-400">Add both Clerk keys to Vercel Project Settings for the hosted app, or to <code className="text-violet-300">.env.local</code> for local development. Then redeploy or restart SynapCode.</p><Link href="/" className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[.05]">Return home</Link></div>}
      </div>
    </main>
  );
}
