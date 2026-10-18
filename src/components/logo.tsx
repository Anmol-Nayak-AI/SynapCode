import { CodeXml } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-[#fffaf3] shadow-[0_0_22px_rgba(244,111,82,.24)] before:absolute before:inset-[1px] before:rounded-[7px] before:bg-overlay/20">
        <CodeXml className="relative" size={17} strokeWidth={2.1} />
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-[-.02em] text-foreground">Synap<span className="text-violet-400">Code</span></span>}
    </div>
  );
}
