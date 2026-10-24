import { auth, clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, Building2, Check, Mail, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";
import { inviteOrganizationMember, updateOrganizationName } from "./actions";

export const instant = false;

const messages: Record<string, string> = {
  permission: "Only Console administrators can make that change.",
  name: "Console names must be between 2 and 64 characters.",
  update: "The Console profile could not be updated. Please try again.",
  email: "Enter a valid email address.",
  invite: "The invitation could not be sent. The address may already be invited.",
};

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  if (!isClerkConfigured()) redirect("/sign-in");
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  if (!session.orgId) redirect("/start");

  const clerk = await clerkClient();
  const [organization, membershipList] = await Promise.all([
    clerk.organizations.getOrganization({ organizationId: session.orgId, includeMembersCount: true }),
    clerk.organizations.getOrganizationMembershipList({ organizationId: session.orgId, limit: 100, orderBy: "+created_at" }),
  ]);
  const query = await searchParams;
  const isAdmin = session.orgRole === "org:admin";
  const memberCount = organization.membersCount ?? membershipList.totalCount;

  return (
    <main className="spatial-shell min-h-screen bg-background/80 text-slate-300">
      <header className="sticky top-0 z-20 border-b border-violet-400/[.1] bg-panel-deep/[.82] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Back to Console"><Logo /></Link>
          <div className="flex items-center gap-2"><ThemeToggle compact /><Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.07] px-3 text-[10px] font-semibold text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-400/[.11]"><ArrowLeft size={13} />Back to Console</Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-violet-400"><ShieldCheck size={12} />Console control center</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-slate-50 sm:text-4xl">Organization settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage your Console identity and team from a focused, SynapCode-native interface.</p></div>
          <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3"><span className="grid size-9 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Users size={16} /></span><div><p className="text-sm font-semibold text-slate-100">{memberCount}</p><p className="text-[9px] text-slate-600">Team member{memberCount === 1 ? "" : "s"}</p></div></div>
        </div>

        {(query.error || query.saved) && <div className={`mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${query.error ? "border-red-400/20 bg-red-400/[.055] text-red-300" : "border-emerald-400/20 bg-emerald-400/[.055] text-emerald-300"}`}>{query.error ? <ShieldCheck size={14} /> : <Check size={14} />}{query.error ? messages[query.error] ?? "That change could not be completed." : query.saved === "invite" ? "Invitation sent." : "Console profile updated."}</div>}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="holo-panel hud-corners overflow-hidden rounded-2xl">
            <div className="relative z-[1] border-b border-white/[.07] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-violet-300"><Building2 size={20} /></span><div><h2 className="text-base font-semibold text-slate-100">Console profile</h2><p className="mt-0.5 text-[10px] text-slate-600">Visible to everyone in this organization.</p></div></div></div>
            <div className="relative z-[1] p-5 sm:p-6">
              <form action={updateOrganizationName} className="space-y-4">
                <div><label htmlFor="organization-name" className="text-[9px] font-semibold uppercase tracking-[.15em] text-slate-500">Console name</label><input id="organization-name" name="name" defaultValue={organization.name} disabled={!isAdmin} minLength={2} maxLength={64} className="mt-2 w-full rounded-xl border border-white/[.09] bg-black/10 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-700 focus:border-violet-400/35 disabled:cursor-not-allowed disabled:opacity-60" /></div>
                <div className="grid gap-3 sm:grid-cols-2"><ReadOnlyField label="Console slug" value={organization.slug} /><ReadOnlyField label="Your access" value={isAdmin ? "Administrator" : "Member"} /></div>
                {isAdmin ? <button type="submit" className="rounded-xl border border-violet-300/20 bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2.5 text-[10px] font-semibold text-[var(--accent-contrast)] shadow-[0_10px_30px_rgba(0,242,254,.12)] transition hover:brightness-110">Save Console profile</button> : <p className="text-[10px] text-slate-600">An administrator can update the Console profile.</p>}
              </form>
            </div>
          </section>

          <aside className="holo-panel hud-corners overflow-hidden rounded-2xl">
            <div className="relative z-[1] border-b border-white/[.07] p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[.07] text-cyan-300"><Mail size={17} /></span><div><h2 className="text-sm font-semibold text-slate-100">Invite a teammate</h2><p className="mt-0.5 text-[9px] text-slate-600">Add a member to this Console.</p></div></div></div>
            <div className="relative z-[1] p-5">{isAdmin ? <form action={inviteOrganizationMember}><label htmlFor="member-email" className="text-[9px] font-semibold uppercase tracking-[.15em] text-slate-500">Email address</label><input id="member-email" name="email" type="email" required placeholder="developer@company.com" className="mt-2 w-full rounded-xl border border-white/[.09] bg-black/10 px-3 py-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-700 focus:border-cyan-400/35" /><button type="submit" className="mt-3 w-full rounded-xl border border-white/[.08] bg-white/[.05] px-4 py-2.5 text-[10px] font-semibold text-slate-200 transition hover:border-cyan-400/25 hover:bg-cyan-400/[.07] hover:text-cyan-300">Send invitation</button></form> : <p className="text-[10px] leading-5 text-slate-500">Ask a Console administrator to invite new members.</p>}</div>
          </aside>
        </div>

        <section className="holo-panel hud-corners mt-5 overflow-hidden rounded-2xl">
          <div className="relative z-[1] flex items-center justify-between border-b border-white/[.07] p-5 sm:px-6"><div><h2 className="text-base font-semibold text-slate-100">Team directory</h2><p className="mt-1 text-[10px] text-slate-600">People with access to {organization.name}.</p></div><span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.055] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[.13em] text-emerald-400">{memberCount} active</span></div>
          <div className="relative z-[1] divide-y divide-white/[.06]">
            {membershipList.data.map((member) => {
              const publicUser = member.publicUserData;
              const name = [publicUser?.firstName, publicUser?.lastName].filter(Boolean).join(" ") || publicUser?.identifier || "Console member";
              const memberInitials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
              return <div key={member.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-[10px] font-semibold text-slate-400">{memberInitials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{name}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{publicUser?.identifier}</p></div><span className="rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-1.5 text-[8px] capitalize text-slate-500">{member.role.replace("org:", "")}</span></div>;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-slate-500">{label}</p><div className="mt-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3.5 py-3 text-xs text-slate-400">{value}</div></div>;
}
