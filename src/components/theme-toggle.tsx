"use client";

import { useEffect, useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";

const storageKey = "synapcode-theme";
const themeOrder = ["dark", "light", "synthwave"] as const;
export type ThemeMode = (typeof themeOrder)[number];

function currentTheme(): ThemeMode {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "synthwave" ? theme : "dark";
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const update = () => setTheme(currentTheme());
    update();
    window.addEventListener("synapcode-theme", update);
    return () => window.removeEventListener("synapcode-theme", update);
  }, []);

  return theme;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useThemeMode();
  const nextTheme = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
  const labels: Record<ThemeMode, string> = { dark: "Cyber Void", light: "Frost", synthwave: "Amber Terminal" };

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme === "light" ? "light" : "dark";
    localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new CustomEvent("synapcode-theme", { detail: nextTheme }));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch theme. Current: ${labels[theme]}. Next: ${labels[nextTheme]}`}
      title={`${labels[theme]} theme — switch to ${labels[nextTheme]}`}
      className={`grid place-items-center rounded-lg border border-violet-400/15 bg-violet-400/[.045] text-slate-400 shadow-[inset_0_1px_rgba(255,255,255,.04),0_0_24px_rgba(0,242,254,.04)] backdrop-blur-xl transition hover:border-violet-400/35 hover:bg-violet-400/[.08] hover:text-violet-300 ${compact ? "size-8" : "size-9"}`}
    >
      <Sun className="theme-icon-sun" size={compact ? 14 : 15} />
      <Moon className="theme-icon-moon" size={compact ? 14 : 15} />
      <Sparkles className="theme-icon-synthwave" size={compact ? 14 : 15} />
    </button>
  );
}
