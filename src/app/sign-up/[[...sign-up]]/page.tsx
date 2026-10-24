import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthPortal } from "@/components/auth-portal";
import { isClerkConfigured } from "@/lib/auth/context";

// Clerk's authentication component reads the current request URL.
export const instant = false;

export default function SignUpPage() {
  const enabled = isClerkConfigured();
  return (
    <AuthPortal mode="sign-up">
      {enabled ? <Suspense fallback={<div className="h-80 w-full animate-pulse rounded-2xl border border-white/10 bg-panel" />}><SignUp fallbackRedirectUrl="/start" signInUrl="/sign-in" /></Suspense> : <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[.045] p-6 text-center"><p className="font-semibold text-sky-100">Account creation is not configured</p><p className="mt-2 text-sm leading-6 text-slate-400">Add both Clerk keys to Vercel Project Settings for the hosted app, or to <code className="text-violet-300">.env.local</code> for local development. Then redeploy or restart SynapCode.</p><Link href="/" className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[.05]">Return home</Link></div>}
    </AuthPortal>
  );
}
