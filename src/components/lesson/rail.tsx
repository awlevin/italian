"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const ride = { type: "spring", stiffness: 120, damping: 22 } as const;

/**
 * Lesson progress as a rail line with a tiny train riding it.
 * The train puffs when it moves forward and judders when a card is missed.
 */
export function Rail({ value, jolt = 0, from }: { value: number; jolt?: number; from?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const start = from === undefined ? undefined : Math.max(0, Math.min(1, from)) * 100;
  const last = useRef(start ?? pct);
  const lastJolt = useRef(jolt);
  const [bump, setBump] = useState<{ n: number; kind: "go" | "jolt" }>({ n: 0, kind: "go" });

  useEffect(() => {
    if (pct > last.current + 0.01) setBump((b) => ({ n: b.n + 1, kind: "go" }));
    last.current = pct;
  }, [pct]);
  useEffect(() => {
    if (jolt !== lastJolt.current) setBump((b) => ({ n: b.n + 1, kind: "jolt" }));
    lastJolt.current = jolt;
  }, [jolt]);

  return (
    <div className="relative h-6 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      {/* Sleepers */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-[7px] h-2.5 opacity-70"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--line) 0 2px, transparent 2px 9px)" }}
      />
      <div className="absolute inset-x-0 top-[9.5px] h-[5px] rounded-full border border-line bg-paper-2" />
      <motion.div
        className="absolute top-[9.5px] left-0 h-[5px] rounded-full bg-accent"
        initial={start === undefined ? false : { width: `${start}%` }}
        animate={{ width: `${pct}%` }}
        transition={ride}
      />
      <motion.div
        className="absolute inset-y-0 -ml-4 flex items-center"
        initial={start === undefined ? false : { left: `${start}%` }}
        animate={{ left: `${pct}%` }}
        transition={ride}
      >
        {/* Steam, left behind as the train pulls away. */}
        {bump.n > 0 && bump.kind === "go" && (
          <span key={`puff-${bump.n}`} aria-hidden className="pointer-events-none absolute top-1 left-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute size-2 rounded-full bg-ink-3/40"
                initial={{ opacity: 0.8, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: 0, x: -10 - i * 7, y: -6 - i * 3, scale: 1 + i * 0.35 }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
              />
            ))}
          </span>
        )}
        <motion.div
          key={`train-${bump.n}`}
          initial={{ x: 0, y: 0, rotate: 0 }}
          animate={bump.kind === "jolt" ? { x: [0, -2, 2, -1, 0], rotate: [0, -4, 3, 0] } : { y: [0, -2, 0] }}
          transition={{ duration: bump.kind === "jolt" ? 0.4 : 0.35, ease: "easeOut" }}
          className="grid h-6 w-8 place-items-center rounded-[8px_12px_6px_6px] bg-ink shadow-[0_2px_0_rgb(0_0_0/0.15)]"
        >
          <span className="flex gap-[3px]">
            <span className="size-[5px] rounded-[1.5px] bg-lemon dark:bg-accent" />
            <span className="size-[5px] rounded-[1.5px] bg-lemon dark:bg-accent" />
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
