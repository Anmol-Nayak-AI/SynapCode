"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "synapcode-theme";

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function useThemeMode() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const update = () => setTheme(currentTheme());
    update();
    window.addEventListener("synapcode-theme", update);
    return () => window.removeEventListener("synapcode-theme", update);
  }, []);

  return theme;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function toggleTheme() {
    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new CustomEvent("synapcode-theme", { detail: nextTheme }));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
      className={`grid place-items-center rounded-lg border border-white/10 bg-white/[.035] text-slate-400 transition hover:border-violet-400/30 hover:text-violet-400 ${compact ? "size-8" : "size-9"}`}
    >
      <Sun className="theme-icon-sun" size={compact ? 14 : 15} />
      <Moon className="theme-icon-moon" size={compact ? 14 : 15} />
    </button>
  );
}
