import Link from "next/link";

export function BackToHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Back to homepage"
      className="inline-flex h-9 items-center rounded-lg px-2 text-sm font-normal tracking-[-.01em] text-slate-400 transition-[background-color,color] hover:bg-white/[.035] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="hidden sm:inline">Back to homepage</span>
      <span className="sm:hidden">Home</span>
    </Link>
  );
}
