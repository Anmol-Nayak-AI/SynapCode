"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { resolveOrganization } from "./actions";

export function ActivateOrganization() {
  const { setActive } = useClerk();
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    resolveOrganization().then(async (organization) => { if (!cancelled) { await setActive({ organization }); router.replace("/dashboard"); router.refresh(); } }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Workspace setup failed."); });
    return () => { cancelled = true; };
  }, [router, setActive]);
  if (error) return <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/[.05] p-5 text-sm text-red-200"><p className="font-semibold">Workspace setup failed</p><p className="mt-2 text-red-200/70">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-400/15 px-3 py-2 text-xs font-semibold">Try again</button></div>;
  return <div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-violet-400" />Creating or activating your organization…</div>;
}
