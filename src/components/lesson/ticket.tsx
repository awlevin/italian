"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

const fmt = (d: Date) =>
  d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

/** A train ticket for the stop just completed. The stamp lands with a thunk. */
export function Ticket({
  from,
  to,
  accuracy,
  stamp = true,
}: {
  from: string;
  to: string;
  accuracy: number;
  stamp?: boolean;
}) {
  const shake = useAnimationControls();
  useEffect(() => {
    if (!stamp) return;
    const id = setTimeout(() => {
      sfx.stamp();
      void shake.start({ y: [0, 4, -1, 0], rotate: [-1.5, -0.6, -1.2, -1], transition: { duration: 0.3 } });
    }, 1050);
    return () => clearTimeout(id);
  }, [stamp, shake]);

  const pct = Math.round(accuracy * 100);

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, rotate: -4 }}
      animate={{ y: 0, opacity: 1, rotate: -1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
    >
      <motion.div
        animate={shake}
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[18px] bg-card text-ink shadow-lift"
        style={{
          // Punched notches on both sides of the stub line.
          maskImage:
            "radial-gradient(circle 11px at 0 68%, transparent 10px, #000 11px), radial-gradient(circle 11px at 100% 68%, transparent 10px, #000 11px)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <div className="flex items-center justify-between bg-accent px-5 py-2.5 text-accent-ink">
          <span className="font-mono text-[11px] font-bold tracking-[0.2em]">BIGLIETTO · PONTE</span>
          <span className="font-mono text-[11px] font-bold tracking-[0.2em]">1ª CLASSE</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-5 pt-5 pb-6">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-3">DA</p>
            <p className="font-display text-[24px] leading-tight">{from}</p>
          </div>
          <svg width="40" height="16" viewBox="0 0 40 16" className="mb-2 text-ink-3" aria-hidden>
            <path d="M0 8h36M30 2l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <div className="text-right">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-3">A</p>
            <p className="font-display text-[24px] leading-tight">{to}</p>
          </div>
        </div>
        <div className="mx-5 border-t-2 border-dashed border-line" />
        <div className="flex items-center justify-between px-5 pt-4 pb-5 font-mono text-[12px]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ink-3">DATA</p>
            <p className="font-bold">{fmt(new Date())}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-[0.18em] text-ink-3">PRECISIONE</p>
            <p className="font-bold">{pct}%</p>
          </div>
        </div>

        {stamp && (
          <motion.div
            initial={{ scale: 2.4, opacity: 0, rotate: -28 }}
            animate={{ scale: 1, opacity: 0.88, rotate: -14 }}
            transition={{ delay: 0.95, type: "spring", stiffness: 600, damping: 22 }}
            className="pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-multiply dark:mix-blend-screen"
          >
            <div className="grid size-[118px] place-items-center rounded-full border-[3.5px] border-wrong p-1.5 text-wrong">
              <div className="grid size-full place-items-center rounded-full border-[1.5px] border-wrong text-center">
                <div>
                  <p className="font-mono text-[9px] font-bold tracking-[0.2em]">★ {to.toUpperCase().slice(0, 10)} ★</p>
                  <p className="font-display text-[17px] leading-none font-semibold italic">Convalidato</p>
                  <p className="mt-0.5 font-mono text-[9px] font-bold tracking-[0.1em]">{fmt(new Date())}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
