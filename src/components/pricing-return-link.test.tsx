// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PricingReturnLink } from "@/components/pricing-return-link";

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

beforeEach(() => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PricingReturnLink", () => {
  it("returns Console-originated pricing visits to the dashboard", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("from=console"));
    render(<PricingReturnLink />);

    expect(screen.getByRole("link", { name: "Back to Console" }).getAttribute("href")).toBe("/dashboard");
  });

  it("returns public pricing visits to the homepage", () => {
    render(<PricingReturnLink />);

    expect(screen.getByRole("link", { name: "Back to homepage" }).getAttribute("href")).toBe("/");
  });
});
