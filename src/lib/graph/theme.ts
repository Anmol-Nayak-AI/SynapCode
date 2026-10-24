export type GraphTheme = "dark" | "light" | "synthwave";

export interface GraphPalette {
  background: string;
  grid: string;
  staticEdge: string;
  dynamicEdge: string;
}

const graphPalettes: Record<GraphTheme, GraphPalette> = {
  dark: {
    background: "#050a14",
    grid: "#17394c",
    staticEdge: "#4facfe",
    dynamicEdge: "#72ff8d",
  },
  light: {
    background: "#e3f0f3",
    grid: "#9bb9bf",
    staticEdge: "#125b97",
    dynamicEdge: "#086f49",
  },
  synthwave: {
    background: "#0d0b07",
    grid: "#41361d",
    staticEdge: "#f5cf72",
    dynamicEdge: "#a7e94f",
  },
};

export function getGraphPalette(theme: GraphTheme) {
  return graphPalettes[theme];
}
