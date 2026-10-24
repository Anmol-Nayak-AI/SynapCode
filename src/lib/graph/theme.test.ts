import { describe, expect, it } from "vitest";
import { getGraphPalette } from "@/lib/graph/theme";

describe("dependency graph theme palette", () => {
  it("uses distinct graph colors for every application theme", () => {
    const dark = getGraphPalette("dark");
    const light = getGraphPalette("light");
    const synthwave = getGraphPalette("synthwave");

    expect(new Set([dark.background, light.background, synthwave.background]).size).toBe(3);
    expect(new Set([dark.staticEdge, light.staticEdge, synthwave.staticEdge]).size).toBe(3);
    expect(new Set([dark.dynamicEdge, light.dynamicEdge, synthwave.dynamicEdge]).size).toBe(3);
  });

  it("uses amber and lime connections in Amber Terminal", () => {
    expect(getGraphPalette("synthwave")).toMatchObject({
      staticEdge: "#f5cf72",
      dynamicEdge: "#a7e94f",
    });
  });
});
