// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    localStorage.clear();
  });

  it("switches themes and persists the preference", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /toggle light and dark mode/i });

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("synapcode-theme")).toBe("light");

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("synapcode-theme")).toBe("dark");
  });
});
