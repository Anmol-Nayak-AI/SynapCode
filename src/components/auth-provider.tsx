"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return enabled ? (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#f46f52",
          colorPrimaryForeground: "#fffaf3",
          colorBackground: "var(--surface)",
          colorInput: "var(--surface-deep)",
          colorInputForeground: "var(--foreground)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--tone-500)",
          colorNeutral: "var(--foreground)",
          borderRadius: "0.75rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  ) : children;
}
