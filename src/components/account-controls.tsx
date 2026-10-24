"use client";

import { useClerk, useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { Building2, Check, ChevronDown, LogOut, Plus, Settings2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

export function AccountControls({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return <div aria-label="Demo account" className="ml-1 grid size-8 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-400 to-cyan-400 text-[10px] font-bold text-[var(--accent-contrast)] shadow-[0_0_22px_rgba(0,242,254,.18)]">AA</div>;
  }
  return <AuthenticatedAccountControls />;
}

function initials(value?: string | null) {
  return (value ?? "Console").split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function AuthenticatedAccountControls() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { signOut } = useClerk();
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const organizationList = useOrganizationList({ userMemberships: { infinite: true, pageSize: 20 } });

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function switchWorkspace(organizationId: string) {
    if (!organizationList.isLoaded || organizationId === organization?.id) {
      setOpen(false);
      return;
    }
    setBusy(organizationId);
    setError("");
    try {
      await organizationList.setActive({ organization: organizationId });
      setOpen(false);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not switch Console. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name || !organizationList.isLoaded) return;
    setBusy("create");
    setError("");
    try {
      const created = await organizationList.createOrganization({ name });
      await organizationList.setActive({ organization: created.id });
      setNewWorkspaceName("");
      setShowCreate(false);
      setOpen(false);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not create the Console. Check the name and try again.");
    } finally {
      setBusy(null);
    }
  }

  const userLabel = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account";
  const membershipLabel = membership?.role === "org:admin" ? "Admin" : "Member";

  return (
    <div ref={containerRef} className="relative ml-1 flex items-center gap-2">
      <Link href="/pricing?from=console" className="hidden rounded-lg border border-white/[.08] px-2.5 py-2 text-[9px] text-slate-400 transition hover:border-violet-400/25 hover:text-violet-300 md:block">Plan</Link>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="group flex h-9 max-w-[210px] items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] py-1 pl-1 pr-2 text-left shadow-[inset_0_1px_rgba(255,255,255,.04)] transition hover:border-violet-400/25 hover:bg-white/[.055]">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/90 to-cyan-400/90 text-[9px] font-bold text-[var(--accent-contrast)] shadow-[0_0_18px_rgba(0,242,254,.15)]">{initials(organization?.name ?? userLabel)}</span>
        <span className="hidden min-w-0 flex-1 sm:block"><span className="block truncate text-[10px] font-medium text-slate-200">{organization?.name ?? "Console"}</span><span className="block truncate text-[8px] text-slate-600">{membershipLabel}</span></span>
        <ChevronDown size={12} className={`hidden shrink-0 text-slate-600 transition sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-violet-400/15 bg-panel-deep/95 shadow-[0_28px_90px_rgba(0,0,0,.5)] backdrop-blur-2xl">
          <div className="border-b border-white/[.07] p-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><Building2 size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-100">{organization?.name ?? "Console"}</p><p className="mt-0.5 truncate text-[9px] text-slate-500">{userLabel} · {membershipLabel}</p></div><span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[.12em] text-emerald-400"><i className="size-1 rounded-full bg-emerald-400" />Active</span></div></div>

          <div className="max-h-56 overflow-y-auto p-2">
            <p className="px-2 pb-1.5 pt-1 text-[8px] font-semibold uppercase tracking-[.16em] text-slate-600">Switch Console</p>
            {organizationList.userMemberships.data?.map((item) => {
              const active = item.organization.id === organization?.id;
              return <button key={item.id} type="button" role="menuitem" disabled={busy !== null} onClick={() => void switchWorkspace(item.organization.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-white/[.045] disabled:opacity-60"><span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[.07] bg-white/[.035] text-[8px] font-semibold text-slate-400">{initials(item.organization.name)}</span><span className="min-w-0 flex-1 truncate text-[10px] text-slate-300">{item.organization.name}</span>{active && <Check size={13} className="text-emerald-400" />}{busy === item.organization.id && <span className="text-[8px] text-violet-300">Switching…</span>}</button>;
            })}
          </div>

          <div className="border-t border-white/[.07] p-2">
            {showCreate ? (
              <form onSubmit={(event) => void createWorkspace(event)} className="rounded-xl border border-violet-400/15 bg-violet-400/[.045] p-2"><label htmlFor="new-workspace-name" className="px-1 text-[8px] font-semibold uppercase tracking-[.14em] text-slate-500">New Console</label><div className="mt-1.5 flex gap-1.5"><input id="new-workspace-name" value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} autoFocus maxLength={64} placeholder="Console name" className="min-w-0 flex-1 rounded-lg border border-white/[.09] bg-black/10 px-2.5 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-700 focus:border-violet-400/35" /><button type="submit" disabled={!newWorkspaceName.trim() || busy !== null} className="rounded-lg bg-violet-400 px-2.5 text-[9px] font-semibold text-[var(--accent-contrast)] disabled:opacity-50">{busy === "create" ? "Creating…" : "Create"}</button></div></form>
            ) : <button type="button" role="menuitem" onClick={() => setShowCreate(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[10px] text-slate-400 transition hover:bg-white/[.045] hover:text-slate-200"><Plus size={14} className="text-violet-400" />Create Console</button>}
            {error && <p className="px-3 py-2 text-[9px] leading-relaxed text-red-300">{error}</p>}
            <Link role="menuitem" href="/organization" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[10px] text-slate-400 transition hover:bg-white/[.045] hover:text-slate-200"><Settings2 size={14} />Console settings</Link>
            <button type="button" role="menuitem" onClick={() => void signOut({ redirectUrl: "/" })} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[10px] text-slate-400 transition hover:bg-red-400/[.06] hover:text-red-300"><LogOut size={14} />Sign out</button>
          </div>
          <div className="flex items-center gap-2 border-t border-white/[.06] bg-white/[.02] px-4 py-2 text-[8px] text-slate-600"><UserRound size={11} />Session secured for {user?.primaryEmailAddress?.emailAddress ?? "your account"}</div>
        </div>
      )}
    </div>
  );
}
