"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchStep } from "@/content/types";
import { speak } from "@/lib/audio";
import { shuffle } from "@/lib/diff";
import { sfx } from "@/lib/sfx";
import { Prompt } from "./prompt";
import type { ExerciseProps } from "./types";

type Side = "it" | "en";

export function Match({ step, submit, phase }: ExerciseProps<MatchStep>) {
  const left = useMemo(() => shuffle(step.pairs.map((_, i) => i)), [step]);
  const right = useMemo(() => shuffle(step.pairs.map((_, i) => i)), [step]);
  const [sel, setSel] = useState<{ side: Side; i: number } | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<{ it: number; en: number; n: number } | null>(null);
  const mistakes = useRef(0);

  // A mismatch flashes red, then lets go.
  useEffect(() => {
    if (!miss) return;
    const id = setTimeout(() => setMiss(null), 650);
    return () => clearTimeout(id);
  }, [miss]);

  const tap = (side: Side, i: number) => {
    if (done.has(i) || phase !== "answering") return;
    if (side === "it") speak(step.pairs[i].it);
    if (!sel || sel.side === side) {
      sfx.tap();
      return setSel(sel?.side === side && sel.i === i ? null : { side, i });
    }
    const [it, en] = side === "it" ? [i, sel.i] : [sel.i, i];
    setSel(null);
    if (it === en) {
      const next = new Set(done).add(i);
      setDone(next);
      setMiss(null);
      if (next.size === step.pairs.length) {
        const n = mistakes.current;
        setTimeout(() => submit({ correct: n === 0, note: n ? `${n} mismatch${n > 1 ? "es" : ""} on the way` : undefined }), 420);
      } else sfx.match(next.size - 1);
    } else {
      mistakes.current++;
      sfx.wrong();
      setMiss({ it, en, n: (miss?.n ?? 0) + 1 });
    }
  };

  const allDone = done.size === step.pairs.length;

  const cell = (side: Side, i: number, label: string, row: number) => {
    const isDone = done.has(i);
    const isSel = sel?.side === side && sel.i === i;
    const isMiss = miss?.[side] === i;
    return (
      <motion.button
        key={`${side}${i}-${isMiss ? miss.n : 0}`}
        type="button"
        data-match={side}
        onClick={() => tap(side, i)}
        disabled={isDone}
        lang={side}
        initial={isMiss ? { x: 0 } : false}
        animate={
          isDone
            ? allDone
              ? { opacity: 1, scale: [0.96, 1.04, 1], transition: { delay: row * 0.05, duration: 0.35 } }
              : { opacity: 0.4, scale: [1, 1.05, 0.97], transition: { duration: 0.35 } }
            : isMiss
              ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.35 } }
              : { opacity: 1, scale: isSel ? 1.03 : 1, y: isSel ? -2 : 0 }
        }
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className={`flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-3 py-2.5 text-center text-[16px] leading-tight transition-[background-color,border-color,box-shadow] duration-200 ${
          isDone
            ? "border-olive/60 bg-olive-soft text-ink"
            : isMiss
              ? "border-wrong bg-wrong-soft text-ink"
              : isSel
                ? "border-sea bg-sea-soft text-ink shadow-[0_3px_0_color-mix(in_oklab,var(--sea),transparent_55%)]"
                : "border-line bg-card text-ink shadow-[0_2px_0_var(--line)]"
        } ${side === "it" ? "font-semibold" : ""}`}
      >
        {label}
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Match the pairs" text={step.prompt ?? "Tap an Italian word, then its meaning."} />
      <div className="grid grid-cols-2 gap-2.5" data-reveal>
        {left.flatMap((l, row) => [
          cell("it", l, step.pairs[l].it, row),
          cell("en", right[row], step.pairs[right[row]].en, row),
        ])}
      </div>
    </div>
  );
}
