"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AccountControls({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return <div aria-label="Demo account" className="ml-1 grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[10px] font-bold text-[#fffaf3]">AA</div>;
  }
  return <AuthenticatedAccountControls />;
}

function AuthenticatedAccountControls() {
  return (
    <div className="ml-1 flex items-center gap-2">
      <Link href="/pricing" className="hidden rounded-lg border border-white/[.08] px-2.5 py-2 text-[9px] text-slate-400 transition hover:border-violet-400/25 hover:text-violet-300 md:block">Plan</Link>
      <OrganizationSwitcher
        hidePersonal
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
        organizationProfileMode="navigation"
        organizationProfileUrl="/organization"
        appearance={{ elements: { rootBox: "hidden sm:block", organizationSwitcherTrigger: "text-slate-300" } }}
      />
      <UserButton />
    </div>
  );
}
