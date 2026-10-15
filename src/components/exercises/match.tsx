"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
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
      sfx.correct();
      if (next.size === step.pairs.length) {
        setTimeout(() => submit({ correct: mistakes.current === 0, note: mistakes.current ? `${mistakes.current} mismatch${mistakes.current > 1 ? "es" : ""} on the way` : undefined }), 350);
      }
    } else {
      mistakes.current++;
      sfx.wrong();
      setMiss({ it, en, n: (miss?.n ?? 0) + 1 });
    }
  };

  const cell = (side: Side, i: number, label: string) => {
    const isDone = done.has(i);
    const isSel = sel?.side === side && sel.i === i;
    const isMiss = miss && miss[side] === i;
    return (
      <motion.button
        key={`${side}${i}-${isMiss ? miss.n : 0}`}
        type="button"
        onClick={() => tap(side, i)}
        disabled={isDone}
        lang={side === "it" ? "it" : "en"}
        initial={isMiss ? { x: 0 } : false}
        animate={
          isDone
            ? { opacity: 0.35, scale: 0.96 }
            : isMiss
              ? { x: [0, -6, 6, -4, 4, 0] }
              : { opacity: 1, scale: isSel ? 1.02 : 1 }
        }
        transition={{ duration: isMiss ? 0.35 : 0.2 }}
        className={`flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-3 py-2.5 text-center text-[16px] leading-tight transition-colors ${
          isDone
            ? "border-olive bg-olive-soft text-ink"
            : isSel
              ? "border-sea bg-sea-soft text-ink"
              : isMiss
                ? "border-wrong bg-wrong-soft text-ink"
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
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-2.5">{left.map((i) => cell("it", i, step.pairs[i].it))}</div>
        <div className="grid gap-2.5">{right.map((i) => cell("en", i, step.pairs[i].en))}</div>
      </div>
    </div>
  );
}
