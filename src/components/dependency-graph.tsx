"use client";

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ModuleNode } from "@/components/module-node";
import { useThemeMode } from "@/components/theme-toggle";
import { getGraphPalette, type GraphTheme } from "@/lib/graph/theme";
import type { CodeModule, GraphSnapshot } from "@/types/graph";

const nodeTypes = { module: ModuleNode };

function layout(snapshot: GraphSnapshot, theme: GraphTheme) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 34, ranksep: 86, marginx: 34, marginy: 28 });
  snapshot.modules.forEach((module) => graph.setNode(module.id, { width: 188, height: 88 }));
  snapshot.edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  const nodes: Node[] = snapshot.modules.map((module) => {
    const point = graph.node(module.id);
    return { id: module.id, type: "module", position: { x: point.x - 94, y: point.y - 44 }, data: module as unknown as Record<string, unknown> };
  });
  const palette = getGraphPalette(theme);
  const edges: Edge[] = snapshot.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "default",
    animated: false,
    style: { stroke: edge.type === "dynamic" ? palette.dynamicEdge : palette.staticEdge, strokeWidth: 1.3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.type === "dynamic" ? palette.dynamicEdge : palette.staticEdge, width: 14, height: 14 },
  }));
  return { nodes, edges };
}

export function DependencyGraph({ snapshot, onSelect }: { snapshot: GraphSnapshot; onSelect: (module: CodeModule) => void }) {
  const theme = useThemeMode();
  const flowTheme = theme === "light" ? "light" : "dark";
  const palette = getGraphPalette(theme);
  const graph = useMemo(() => layout(snapshot, theme), [snapshot, theme]);
  const onNodeClick: NodeMouseHandler = (_, node) => onSelect(node.data as unknown as CodeModule);
  return (
    <ReactFlow
      key={`${snapshot.commit}-${snapshot.modules.length}-${theme}`}
      className="synapcode-flow"
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.2}
      maxZoom={1.7}
      colorMode={flowTheme}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={palette.grid} />
      <Controls showInteractive={false} className="!overflow-hidden !rounded-lg !border !border-white/10 !bg-control !shadow-xl [&_button]:!border-white/[.06] [&_button]:!bg-control [&_button]:!fill-slate-400 [&_button:hover]:!bg-panel-strong" />
    </ReactFlow>
  );
}
