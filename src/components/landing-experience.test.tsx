// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LandingExperience } from "./landing-experience";

const scrollIntoViewMock = vi.fn();

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoViewMock,
  });
});

afterEach(() => {
  cleanup();
  scrollIntoViewMock.mockClear();
  window.history.replaceState(null, "", "/");
});
afterAll(() => vi.unstubAllGlobals());

describe("LandingExperience capability workbench", () => {
  it("updates the product preview when a capability is selected", async () => {
    render(<LandingExperience authEnabled={false} />);

    const impactTab = screen.getByRole("tab", { name: /see the blast radius before editing/i });
    fireEvent.click(impactTab);

    expect(impactTab).toHaveAttribute("aria-selected", "true");
    const heading = await screen.findByRole("heading", { name: "See the blast radius before editing" });
    const panel = heading.closest<HTMLElement>('[role="tabpanel"]');
    expect(panel).not.toBeNull();
    if (!panel) return;
    expect(within(panel).getByText("4 modules affected")).toBeTruthy();
    expect(within(panel).getByText("src/hooks/use-query.ts")).toBeTruthy();
  });

  it("supports keyboard navigation between capability tabs", () => {
    render(<LandingExperience authEnabled={false} />);

    const graphTab = screen.getByRole("tab", { name: /navigate a verified dependency graph/i });
    fireEvent.keyDown(graphTab, { key: "ArrowDown" });

    expect(screen.getByRole("tab", { name: /see the blast radius before editing/i })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps authentication prompts out of the landing-page narrative", () => {
    render(<LandingExperience authEnabled />);

    expect(screen.queryByText("Sign in to SynapCode")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in to try it")).not.toBeInTheDocument();
    expect(screen.queryByText("Create account")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore the product/i })).toHaveAttribute("aria-controls", "product");
    expect(screen.queryByRole("link", { name: /review plans/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /compare plans/i })).not.toBeInTheDocument();
  });

  it("opens and focuses the interactive product workbench", () => {
    render(<LandingExperience authEnabled />);

    fireEvent.click(screen.getByRole("button", { name: /explore the product/i }));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(window.location.hash).toBe("#product");
    expect(screen.getByRole("tab", { name: /navigate a verified dependency graph/i })).toHaveFocus();
  });
});
