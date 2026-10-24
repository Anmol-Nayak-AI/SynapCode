"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";

export function AuthStage({ children, framed = true }: { children: ReactNode; framed?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(0,242,254,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,254,.05)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
        <motion.div
          className="absolute left-[12%] top-[18%] size-72 rounded-full bg-violet-500/[.10] blur-3xl"
          animate={{ x: [0, 34, 0], y: [0, -22, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[8%] right-[10%] size-80 rounded-full bg-emerald-400/[.07] blur-3xl"
          animate={{ x: [0, -28, 0], y: [0, 20, 0], scale: [1.06, 0.96, 1.06] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute left-[8%] top-[20%] font-mono text-8xl font-semibold text-violet-400/[.035]">{"{"}</div>
        <div className="absolute bottom-[16%] right-[8%] font-mono text-8xl font-semibold text-emerald-400/[.035]">{"}"}</div>
        <motion.div className="absolute left-[18%] top-1/2 h-px w-40 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" animate={{ x: [0, 140, 0], opacity: [.2, .8, .2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-[24%] right-[16%] h-32 w-px bg-gradient-to-b from-transparent via-emerald-400/35 to-transparent" animate={{ y: [0, -90, 0], opacity: [.2, .7, .2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <motion.div
        className={framed ? "relative z-0 flex flex-col items-center gap-6 rounded-[28px] border border-violet-400/[.08] bg-panel-deep/20 p-5 shadow-[0_0_120px_rgba(0,242,254,.06)] backdrop-blur-[2px]" : "relative z-0 w-full"}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
