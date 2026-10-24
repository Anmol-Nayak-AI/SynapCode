// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BackToHomeLink } from "@/components/back-to-home-link";

afterEach(cleanup);

describe("BackToHomeLink", () => {
  it("returns Console visitors to the dashboard", () => {
    render(
      <BackToHomeLink
        href="/dashboard"
        label="Back to Console"
        compactLabel="Console"
      />,
    );

    const link = screen.getByRole("link", { name: "Back to Console" });
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(screen.getByText("Console")).toBeTruthy();
  });

  it("keeps the public homepage fallback", () => {
    render(<BackToHomeLink />);

    expect(screen.getByRole("link", { name: "Back to homepage" }).getAttribute("href")).toBe("/");
  });
});
