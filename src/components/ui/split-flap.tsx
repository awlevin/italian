"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÙ'·-0123456789";
const GAP = 3;
const MAX_W = { sm: 21, lg: 36 } as const;

function Cell({ target, delay }: { target: string; delay: number }) {
  const reduced = useReducedMotion();
  const [flipping, setCh] = useState(" ");
  const ch = reduced ? target : flipping;

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const steps = 6 + Math.floor(Math.random() * 6);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      if (i >= steps) return setCh(target);
      setCh(CHARS[Math.floor(Math.random() * CHARS.length)]);
      timer = setTimeout(tick, 55);
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [target, delay, reduced]);

  return (
    <span
      className="relative inline-grid shrink-0 place-items-center overflow-hidden bg-board-flap font-mono font-bold text-board-ink shadow-[inset_0_-1px_0_rgb(255_255_255/0.06),0_1px_0_rgb(0_0_0/0.4)] [perspective:200px]"
      style={{
        width: "var(--flap-w)",
        height: "calc(var(--flap-w) * 1.44)",
        fontSize: "calc(var(--flap-w) * 0.9)",
        borderRadius: "calc(var(--flap-w) * 0.19)",
      }}
    >
      <motion.span
        key={ch}
        initial={{ rotateX: -80, opacity: 0.4 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.09, ease: "easeOut" }}
        style={{ transformOrigin: "50% 0%" }}
        className="leading-none"
      >
        {ch === " " ? " " : ch}
      </motion.span>
      {/* The split. */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/70" />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.035]" />
    </span>
  );
}

/**
 * A departure-board line. Each letter clatters to its target.
 * Cells shrink to fit the available width, so a long word never wraps.
 */
export function SplitFlap({ text, size = "sm", className = "" }: { text: string; size?: "sm" | "lg"; className?: string }) {
  const chars = text.toUpperCase().split("");
  const n = Math.max(chars.length, 1);
  const width = `min(${MAX_W[size]}px, calc((100cqw - ${(n - 1) * GAP}px) / ${n}))`;
  return (
    <span className="block w-full @container" aria-label={text} role="img">
      <span className={`flex ${className}`} style={{ gap: GAP, ["--flap-w" as string]: width }}>
        {chars.map((c, i) => (
          <Cell key={`${i}-${text}`} target={c} delay={i * 45} />
        ))}
      </span>
    </span>
  );
}
