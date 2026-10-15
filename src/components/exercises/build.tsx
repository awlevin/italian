"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { BuildStep } from "@/content/types";
import { SpeakButton } from "@/components/ui/speak-button";
import { speak } from "@/lib/audio";
import { inSequence, shuffle } from "@/lib/diff";
import { fold } from "@/lib/text";
import { sfx } from "@/lib/sfx";
import { Prompt } from "./prompt";
import type { ExerciseProps } from "./types";
import { AFTER_CHIME_MS, useLater } from "./use-later";

interface Tile {
  id: string;
  word: string;
}

/** Tile rows: 44px tile + 8px gap. The notebook rules sit just under each row. */
const RULES = "repeating-linear-gradient(to bottom, transparent 0 46px, var(--line) 46px 47px, transparent 47px 52px)";
const spring = { type: "spring", stiffness: 520, damping: 34 } as const;

const tileBase =
  "h-11 rounded-xl border-2 px-3.5 text-[17px] font-medium text-ink transition-[background-color,border-color,color] duration-300";
const tileIdle =
  "border-line bg-card shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--line)]";

export function Build({ step, phase, setGrader }: ExerciseProps<BuildStep>) {
  const tiles = useMemo<Tile[]>(() => {
    const words = [...step.answer.split(/\s+/), ...(step.distractors ?? [])];
    return shuffle(words.map((word, i) => ({ id: `t${i}`, word })));
  }, [step]);
  const [placed, setPlaced] = useState<string[]>([]);
  const later = useLater();
  const locked = phase !== "answering";
  const words = useMemo(() => placed.map((id) => tiles.find((t) => t.id === id)!.word), [placed, tiles]);

  useEffect(() => {
    if (!words.length) return setGrader(null);
    const sentence = words.join(" ");
    setGrader(() => ({ correct: [step.answer, ...(step.alt ?? [])].some((a) => fold(a) === fold(sentence)) }));
  }, [words, step, setGrader]);

  const sayAnswer = useEffectEvent(() => later(() => speak(step.answer), AFTER_CHIME_MS));
  useEffect(() => {
    if (locked) sayAnswer();
  }, [locked]);

  // When wrong, mark the tiles that break the order of the right sentence.
  const fits = useMemo(
    () => (phase === "wrong" ? inSequence(words, step.answer.split(/\s+/), (a, b) => fold(a) === fold(b)) : null),
    [phase, words, step.answer],
  );

  const toggle = (id: string) => {
    if (locked) return;
    sfx.tap();
    setPlaced((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Build the sentence" text={step.prompt} />
      <LayoutGroup>
        <div className="space-y-3" data-reveal>
          <div
            className={`relative min-h-[7.75rem] rounded-2xl border-2 border-dashed p-3 transition-colors ${
              phase === "correct" ? "border-ok bg-ok-soft/50" : phase === "wrong" ? "border-wrong bg-wrong-soft/40" : "border-line"
            }`}
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-3 top-3 bottom-0" style={{ backgroundImage: RULES }} />
            <div className="relative flex flex-wrap content-start gap-2">
              {placed.map((id, i) => {
                const t = tiles.find((x) => x.id === id)!;
                const off = fits && !fits[i];
                return (
                  <motion.button
                    layoutId={t.id}
                    key={t.id}
                    type="button"
                    data-tile="placed"
                    onClick={() => toggle(t.id)}
                    disabled={locked}
                    animate={off ? { y: [0, -3, 0], rotate: [0, -2, 0], transition: { duration: 0.4, delay: 0.1, ease: "easeOut" } } : undefined}
                    transition={spring}
                    className={`${tileBase} ${
                      phase === "correct"
                        ? "border-ok/50 bg-card shadow-[0_3px_0_color-mix(in_oklab,var(--ok),transparent_60%)]"
                        : off
                          ? "border-wrong bg-wrong-soft text-wrong shadow-[0_3px_0_color-mix(in_oklab,var(--wrong),transparent_60%)]"
                          : tileIdle
                    }`}
                    lang="it"
                  >
                    {t.word}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {locked && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-3"
              >
                <SpeakButton text={step.answer} size="sm" />
                <p lang="it" className={`font-display text-[20px] leading-snug ${phase === "correct" ? "text-ink-2" : "text-ink"}`}>
                  {step.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          animate={{ opacity: locked ? 0.35 : 1 }}
          className="flex min-h-[3rem] flex-wrap justify-center gap-2"
          aria-hidden={locked}
        >
          {tiles.map((t) =>
            placed.includes(t.id) ? (
              <span
                key={t.id}
                aria-hidden
                className="grid h-11 place-items-center rounded-xl bg-paper-2 px-3.5 text-[17px] font-medium text-transparent select-none"
              >
                {t.word}
              </span>
            ) : (
              <motion.button
                layoutId={t.id}
                key={t.id}
                type="button"
                data-tile="bank"
                disabled={locked}
                onClick={() => toggle(t.id)}
                transition={spring}
                className={`${tileBase} ${tileIdle}`}
                lang="it"
              >
                {t.word}
              </motion.button>
            ),
          )}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
