"use client";

import { motion } from "motion/react";

/** Lesson progress as a rail line with a tiny train riding it. */
export function Rail({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="relative h-6 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      {/* Sleepers */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 opacity-60"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--line) 0 2px, transparent 2px 9px)" }}
      />
      <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-paper-2 ring-1 ring-line" />
      <motion.div
        className="absolute top-1/2 left-0 h-[5px] -translate-y-1/2 rounded-full bg-accent"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      />
      <motion.div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={{ left: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      >
        <motion.div
          key={Math.round(pct)}
          initial={{ y: 0 }}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 0.35 }}
          className="grid h-6 w-8 place-items-center rounded-[8px_12px_6px_6px] bg-ink text-paper shadow-[0_2px_0_rgb(0_0_0/0.15)]"
        >
          <span className="flex gap-[3px]">
            <span className="size-[5px] rounded-[1.5px] bg-lemon" />
            <span className="size-[5px] rounded-[1.5px] bg-lemon" />
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
