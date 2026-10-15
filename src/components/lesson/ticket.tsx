"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

const fmt = (d: Date) =>
  d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

/** Height of the tear-off stub. The punched notches sit on its perforation. */
const STUB = 88;
const notch = (x: string) => `radial-gradient(circle at ${x} calc(100% - ${STUB}px), transparent 10px, #000 10.5px)`;
const MASK = `${notch("0")}, ${notch("100%")}`;
/** A faint rim on the paper around each punch, so the notches read as holes, not bumps. */
const rim = (x: string) =>
  `radial-gradient(circle at ${x} calc(100% - ${STUB}px), transparent 10px, rgb(var(--shadow) / 0.12) 10.5px, transparent 13px)`;

const LAND_S = 0.95;

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
      navigator.vibrate?.(12);
      void shake.start({ y: [0, 5, -1, 0], rotate: [-1, -0.2, -1.2, -1], transition: { duration: 0.32 } });
    }, (LAND_S + 0.08) * 1000);
    return () => clearTimeout(id);
  }, [stamp, shake]);

  const pct = Math.round(accuracy * 100);
  const today = fmt(new Date());

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, rotate: -3 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
      // The shadow lives outside the mask so it follows the notched outline.
      style={{ filter: "drop-shadow(0 1px 1px rgb(var(--shadow) / 0.1)) drop-shadow(0 12px 14px rgb(var(--shadow) / 0.14))" }}
      className="mx-auto w-full max-w-sm"
    >
      <motion.div
        animate={shake}
        initial={{ rotate: -1 }}
        className="relative overflow-hidden rounded-[18px] bg-card text-ink"
        style={{
          maskImage: MASK,
          WebkitMaskImage: MASK,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: `${rim("0")}, ${rim("100%")}` }} />
        <div className="flex items-center justify-between bg-accent px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.2em] text-accent-ink">
          <span>BIGLIETTO · CIAO</span>
          <span>1ª CLASSE</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-5 pt-5 pb-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-3">DA</p>
            <p className="truncate font-display text-[24px] leading-tight">{from}</p>
          </div>
          <svg width="40" height="16" viewBox="0 0 40 16" className="mb-2 text-ink-3" aria-hidden>
            <path d="M0 8h36M30 2l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <div className="min-w-0 text-right">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-3">A</p>
            <p className="truncate font-display text-[24px] leading-tight">{to}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-7 border-t-2 border-dashed border-line px-5 font-mono text-[12px]" style={{ height: STUB }}>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ink-3">DATA</p>
            <p className="mt-0.5 font-bold">{today}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ink-3">PRECISIONE</p>
            <p className="mt-0.5 font-bold">{pct}%</p>
          </div>
        </div>

        {stamp && (
          <div className="pointer-events-none absolute right-3 bottom-1.5 mix-blend-multiply dark:mix-blend-screen">
            {/* Ink ring that splashes out on impact. */}
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.5, 0], scale: [0.9, 1, 1.45] }}
              transition={{ delay: LAND_S + 0.06, duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-wrong"
            />
            <motion.div
              initial={{ scale: 2.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 0.9, rotate: -14 }}
              transition={{ delay: LAND_S, type: "spring", stiffness: 700, damping: 24 }}
              className="grid size-[108px] place-items-center rounded-full border-[3.5px] border-wrong p-1.5 text-wrong"
            >
              <div className="grid size-full place-items-center rounded-full border-[1.5px] border-wrong text-center">
                <div>
                  <p className="font-mono text-[8.5px] font-bold tracking-[0.2em]">★ {to.toUpperCase().slice(0, 10)} ★</p>
                  <p className="font-display text-[16px] leading-none font-semibold italic">Convalidato</p>
                  <p className="mt-0.5 font-mono text-[8.5px] font-bold tracking-[0.1em]">{today}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
