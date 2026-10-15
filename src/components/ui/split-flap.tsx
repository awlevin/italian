"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÙ'·-0123456789";

function Cell({ target, delay, size }: { target: string; delay: number; size: "sm" | "lg" }) {
  const [ch, setCh] = useState(" ");

  useEffect(() => {
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
  }, [target, delay]);

  const dims = size === "lg" ? "h-[52px] w-[36px] text-[34px] rounded-[7px]" : "h-[30px] w-[21px] text-[18px] rounded-[4px]";

  return (
    <span
      className={`relative inline-grid place-items-center overflow-hidden bg-[#1c1712] font-mono font-bold text-[#f6efe3] shadow-[inset_0_-1px_0_rgb(255_255_255/0.06),0_1px_0_rgb(0_0_0/0.4)] [perspective:200px] ${dims}`}
    >
      <motion.span
        key={ch}
        initial={{ rotateX: -80, opacity: 0.4 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.09, ease: "easeOut" }}
        style={{ transformOrigin: "50% 0%" }}
        className="leading-none"
      >
        {ch === " " ? " " : ch}
      </motion.span>
      {/* The split. */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/70" />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.035]" />
    </span>
  );
}

/** A departure-board line. Each letter clatters to its target. */
export function SplitFlap({ text, size = "sm", className = "" }: { text: string; size?: "sm" | "lg"; className?: string }) {
  const chars = text.toUpperCase().split("");
  return (
    <span className={`inline-flex flex-wrap gap-[3px] ${className}`} aria-label={text} role="img">
      {chars.map((c, i) => (
        <Cell key={`${i}-${text}`} target={c} delay={i * 45} size={size} />
      ))}
    </span>
  );
}
