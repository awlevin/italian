"use client";

import { LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { BuildStep } from "@/content/types";
import { SpeakButton } from "@/components/ui/speak-button";
import { speak } from "@/lib/audio";
import { shuffle } from "@/lib/diff";
import { fold } from "@/lib/text";
import { sfx } from "@/lib/sfx";
import { Prompt } from "./prompt";
import type { ExerciseProps } from "./types";

interface Tile {
  id: string;
  word: string;
}

export function Build({ step, phase, setGrader }: ExerciseProps<BuildStep>) {
  const tiles = useMemo<Tile[]>(() => {
    const words = [...step.answer.split(/\s+/), ...(step.distractors ?? [])];
    return shuffle(words.map((word, i) => ({ id: `t${i}`, word })));
  }, [step]);
  const [placed, setPlaced] = useState<string[]>([]);
  const locked = phase !== "answering";

  useEffect(() => {
    if (!placed.length) return setGrader(null);
    const sentence = placed.map((id) => tiles.find((t) => t.id === id)!.word).join(" ");
    setGrader(() => {
      const ok = [step.answer, ...(step.alt ?? [])].some((a) => fold(a) === fold(sentence));
      return { correct: ok, answer: step.answer };
    });
  }, [placed, tiles, step, setGrader]);

  useEffect(() => {
    if (phase !== "answering") speak(step.answer);
  }, [phase, step.answer]);

  const toggle = (id: string) => {
    if (locked) return;
    sfx.tap();
    setPlaced((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const tileClass =
    "rounded-xl border-2 border-line bg-card px-3.5 py-2 text-[17px] font-medium text-ink shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--line)]";

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Build the sentence" text={step.prompt} />
      <LayoutGroup>
        <div
          className={`relative flex min-h-[7.5rem] flex-wrap content-start items-start gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors ${
            phase === "correct" ? "border-olive bg-olive-soft/50" : phase === "wrong" ? "border-wrong bg-wrong-soft/50" : "border-line"
          }`}
        >
          {/* Ruled lines, like a notebook. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-3 top-[3.05rem] border-t border-line/80" />
          <div aria-hidden className="pointer-events-none absolute inset-x-3 top-[6rem] border-t border-line/80" />
          {placed.map((id) => {
            const t = tiles.find((x) => x.id === id)!;
            return (
              <motion.button
                layoutId={t.id}
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                className={`${tileClass} relative z-10`}
                lang="it"
              >
                {t.word}
              </motion.button>
            );
          })}
          {locked && (
            <div className="absolute right-2 bottom-2 z-10">
              <SpeakButton text={step.answer} size="sm" />
            </div>
          )}
        </div>

        <div className="flex min-h-[3rem] flex-wrap justify-center gap-2">
          {tiles.map((t) =>
            placed.includes(t.id) ? (
              <span key={t.id} className="rounded-xl bg-paper-2 px-3.5 py-2 text-[17px] font-medium text-transparent select-none">
                {t.word}
              </span>
            ) : (
              <motion.button
                layoutId={t.id}
                key={t.id}
                type="button"
                disabled={locked}
                onClick={() => toggle(t.id)}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                className={tileClass}
                lang="it"
              >
                {t.word}
              </motion.button>
            ),
          )}
        </div>
      </LayoutGroup>
    </div>
  );
}
