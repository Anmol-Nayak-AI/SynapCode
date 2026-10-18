"use client";

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ModuleNode } from "@/components/module-node";
import { useThemeMode } from "@/components/theme-toggle";
import type { CodeModule, GraphSnapshot } from "@/types/graph";

const nodeTypes = { module: ModuleNode };

function layout(snapshot: GraphSnapshot, theme: "light" | "dark") {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 34, ranksep: 86, marginx: 34, marginy: 28 });
  snapshot.modules.forEach((module) => graph.setNode(module.id, { width: 188, height: 88 }));
  snapshot.edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  const nodes: Node[] = snapshot.modules.map((module) => {
    const point = graph.node(module.id);
    return { id: module.id, type: "module", position: { x: point.x - 94, y: point.y - 44 }, data: module as unknown as Record<string, unknown> };
  });
  const dynamicEdge = theme === "light" ? "#168f6c" : "#5ec9a4";
  const standardEdge = theme === "light" ? "#8f786b" : "#75665d";
  const edges: Edge[] = snapshot.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "default",
    animated: edge.type === "dynamic",
    style: { stroke: edge.type === "dynamic" ? dynamicEdge : standardEdge, strokeWidth: 1.3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.type === "dynamic" ? dynamicEdge : standardEdge, width: 14, height: 14 },
  }));
  return { nodes, edges };
}

export function DependencyGraph({ snapshot, onSelect }: { snapshot: GraphSnapshot; onSelect: (module: CodeModule) => void }) {
  const theme = useThemeMode();
  const graph = useMemo(() => layout(snapshot, theme), [snapshot, theme]);
  const onNodeClick: NodeMouseHandler = (_, node) => onSelect(node.data as unknown as CodeModule);
  return (
    <ReactFlow
      key={`${snapshot.commit}-${snapshot.modules.length}`}
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.2}
      maxZoom={1.7}
      colorMode={theme}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={theme === "light" ? "#c8b8aa" : "#574b44"} />
      <Controls showInteractive={false} className="!overflow-hidden !rounded-lg !border !border-white/10 !bg-control !shadow-xl [&_button]:!border-white/[.06] [&_button]:!bg-control [&_button]:!fill-slate-400 [&_button:hover]:!bg-panel-strong" />
      <MiniMap className="!rounded-lg !border !border-white/10 !bg-panel-deep" nodeColor="#f46f52" maskColor={theme === "light" ? "rgba(247, 241, 232, .72)" : "rgba(16, 14, 13, .72)"} pannable zoomable />
    </ReactFlow>
  );
}
