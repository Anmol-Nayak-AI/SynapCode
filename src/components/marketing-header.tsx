"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { RadioTower } from "lucide-react";
import { ConsoleEntryLink } from "@/components/console-entry-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingHeader({ authEnabled }: { authEnabled: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        className="sticky top-0 z-50 border-b border-violet-400/[.08] bg-background/[.68] backdrop-blur-2xl"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" aria-label="SynapCode homepage" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3" aria-label="Primary navigation">
            <span className="mr-1 hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.04] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[.14em] text-emerald-300 lg:inline-flex">
              <RadioTower size={11} /><i className="size-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_currentColor]" /> Graph online
            </span>
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/#product" className="rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-foreground">Product</Link>
              <Link href="/#workflow" className="rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-foreground">Workflow</Link>
              <Link href="/#security" className="rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-foreground">Security</Link>
            </div>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/pricing" className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:text-foreground">Pricing</Link>
            </motion.div>
            <ThemeToggle />
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <ConsoleEntryLink
                authEnabled={authEnabled}
                className="block rounded-lg border border-violet-300/20 bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_10px_38px_rgba(0,242,254,.18)] transition hover:brightness-110"
                signedInChildren="Open Console"
                signedOutChildren="Sign in"
              />
            </motion.div>
          </nav>
        </div>
      </motion.header>
    </MotionConfig>
  );
}
