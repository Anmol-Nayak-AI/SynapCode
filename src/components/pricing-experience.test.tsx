// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PricingPreview, type PricingPlan } from "@/components/pricing-experience";

const plans: PricingPlan[] = [
  { name: "Free", price: "$0", cta: "Start free", description: "For one repository.", features: ["One repository"] },
  { name: "Pro", price: "$19", cta: "Choose Pro", description: "For active codebases.", featured: true, features: ["Unlimited repositories"] },
  { name: "Business", price: "$49", cta: "Choose Business", description: "For teams.", features: ["Everything in Pro"] },
];

afterEach(cleanup);

describe("PricingPreview", () => {
  it("uses one consistent visual style for every plan action", () => {
    render(<PricingPreview plans={plans} accountHref="/sign-up" />);

    const actions = screen.getAllByRole("link");
    expect(actions).toHaveLength(3);
    expect(new Set(actions.map((action) => action.className)).size).toBe(1);
    expect(actions.every((action) => action.getAttribute("href") === "/sign-up")).toBe(true);
    expect(actions.every((action) => action.getAttribute("data-plan-cta") === "true")).toBe(true);
  });

  it("marks Pro as recommended without changing its button", () => {
    render(<PricingPreview plans={plans} accountHref="/sign-up" />);

    expect(screen.getByRole("article", { name: "Pro — recommended" })).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose Pro plan" }).className).toBe(
      screen.getByRole("link", { name: "Start free plan" }).className,
    );
  });
});
