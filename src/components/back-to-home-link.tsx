import Link from "next/link";

type BackToHomeLinkProps = {
  href?: string;
  label?: string;
  compactLabel?: string;
};

export function BackToHomeLink({
  href = "/",
  label = "Back to homepage",
  compactLabel = "Home",
}: BackToHomeLinkProps = {}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-9 items-center rounded-lg border border-violet-400/15 bg-violet-400/[.035] px-3 font-mono text-[11px] font-medium uppercase tracking-[.08em] text-slate-400 shadow-[inset_0_1px_rgba(255,255,255,.025)] transition-[background-color,border-color,color,box-shadow] hover:border-violet-400/30 hover:bg-violet-400/[.07] hover:text-violet-300 hover:shadow-[0_0_24px_rgba(0,242,254,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{compactLabel}</span>
    </Link>
  );
}
