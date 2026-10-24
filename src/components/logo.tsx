import { CodeXml } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-violet-300/30 bg-gradient-to-br from-violet-400 via-cyan-400 to-emerald-400 text-[var(--accent-contrast)] shadow-[0_0_28px_rgba(0,242,254,.28)] before:absolute before:inset-[1px] before:rounded-[7px] before:bg-white/10">
        <CodeXml className="relative" size={17} strokeWidth={2.1} />
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-[-.02em] text-foreground">Synap<span className="text-violet-400">Code</span></span>}
    </div>
  );
}
