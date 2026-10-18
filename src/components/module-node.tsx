"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Braces, Component, FileCode2, Settings2, TestTube2, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CodeModule } from "@/types/graph";

const icons = { page: FileCode2, component: Component, service: Workflow, hook: Braces, config: Settings2, utility: Box, test: TestTube2 };

export function ModuleNode({ data, selected }: NodeProps) {
  const codeModule = data as unknown as CodeModule;
  const Icon = icons[codeModule.kind];
  return (
    <div className={cn("group w-[188px] rounded-xl border bg-panel-strong/95 px-3.5 py-3 shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition", selected ? "border-violet-400 shadow-[0_0_0_3px_rgba(244,111,82,.14),0_16px_40px_rgba(0,0,0,.3)]" : "border-white/[.09] hover:border-white/20")}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-[#7887a8] !bg-node" />
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", codeModule.kind === "service" ? "bg-cyan-400/10 text-cyan-300" : codeModule.kind === "config" ? "bg-amber-400/10 text-amber-300" : "bg-violet-400/10 text-violet-300")}>
          <Icon size={14} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-100">{codeModule.label}</p>
          <p className="mt-0.5 truncate font-mono text-[8px] text-slate-500">{codeModule.path}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-white/[.06] pt-2 text-[9px] text-slate-500">
        <span><b className="font-medium text-slate-300">{codeModule.imports}</b> imports</span>
        <span><b className="font-medium text-slate-300">{codeModule.importedBy}</b> used by</span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-[#7887a8] !bg-node" />
    </div>
  );
}
