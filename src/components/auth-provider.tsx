"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return enabled ? (
    <ClerkProvider
      appearance={{
        options: {
          // Clerk deliberately exposes this for production-style previews while
          // an instance is still using development keys.
          unsafe_disableDevelopmentModeWarnings: true,
        },
        variables: {
          colorPrimary: "var(--accent-400)",
          colorPrimaryForeground: "var(--accent-contrast)",
          colorBackground: "var(--surface)",
          colorInput: "var(--surface-deep)",
          colorInputForeground: "var(--foreground)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--tone-500)",
          colorNeutral: "var(--foreground)",
          borderRadius: "0.75rem",
        },
        elements: {
          rootBox: "w-full",
          cardBox: "w-full shadow-none",
          card: "w-full border-0 bg-transparent p-0 shadow-none",
          header: "items-start text-left",
          headerTitle: "text-left text-xl font-semibold tracking-[-.03em] text-slate-50",
          headerSubtitle: "text-left text-xs text-slate-500",
          socialButtonsBlockButton: "h-11 border-white/[.09] bg-white/[.025] text-slate-300 shadow-none transition hover:border-violet-400/25 hover:bg-violet-400/[.055]",
          socialButtonsBlockButtonText: "text-xs font-medium text-slate-300",
          dividerLine: "bg-white/[.08]",
          dividerText: "text-[10px] text-slate-600",
          formFieldLabel: "text-[10px] font-medium text-slate-400",
          formFieldInput: "h-11 border-white/[.09] bg-black/10 text-sm text-slate-100 shadow-none outline-none transition focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/10",
          formButtonPrimary: "h-11 bg-violet-400 text-xs font-semibold text-[var(--accent-contrast)] shadow-[0_12px_36px_color-mix(in_srgb,var(--accent-400)_18%,transparent)] transition hover:brightness-110",
          identityPreview: "border-white/[.09] bg-white/[.025]",
          identityPreviewText: "text-slate-300",
          formFieldErrorText: "text-red-300",
          alert: "border-red-400/20 bg-red-400/[.06] text-red-200",
          footer: { display: "none" },
          footerAction: { display: "none" },
          footerPages: { display: "none" },
        },
      }}
    >
      {children}
    </ClerkProvider>
  ) : children;
}
