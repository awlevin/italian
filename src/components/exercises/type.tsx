"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { TypeStep } from "@/content/types";
import { IconLightbulb } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";
import { gradeTyped, plain } from "@/lib/text";
import { Prompt, Sentence } from "./prompt";
import type { ExerciseProps } from "./types";

const ACCENTS = ["à", "è", "é", "ì", "ò", "ù"];

export function TypeAnswer({ step, phase, setGrader }: ExerciseProps<TypeStep>) {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const locked = phase !== "answering";
  const canonical = plain(step.answers[0]);

  useEffect(() => {
    const id = setTimeout(() => input.current?.focus({ preventScroll: true }), 380);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!value.trim()) return setGrader(null);
    setGrader(() => {
      const { grade } = gradeTyped(value, step.answers);
      if (grade === "exact") return { correct: true };
      if (grade === "accent") return { correct: true, note: `Mind the accent: «${canonical}»` };
      return { correct: false, answer: canonical };
    });
  }, [value, step.answers, canonical, setGrader]);

  const insert = (ch: string) => {
    const el = input.current;
    if (!el) return;
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    const next = value.slice(0, s) + ch + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + 1, s + 1);
    });
  };

  const sentenceState = phase === "correct" ? "correct" : phase === "wrong" ? "wrong" : "empty";

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Type" text={step.prompt} />
      {step.it && (
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Sentence text={step.it} fill={locked ? canonical : value.trim() || undefined} state={sentenceState} />
          </div>
          {locked && <SpeakButton text={step.it.replace("___", canonical)} />}
        </div>
      )}

      <div className="space-y-2.5">
        <motion.div
          animate={phase === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className={`flex items-center rounded-2xl border-2 bg-card px-4 transition-colors focus-within:border-sea ${
            phase === "correct" ? "border-olive" : phase === "wrong" ? "border-wrong" : "border-line"
          }`}
        >
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={locked}
            lang="it"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="Scrivi in italiano…"
            aria-label="Your answer"
            className="h-14 w-full bg-transparent text-[19px] text-ink outline-none placeholder:text-ink-3/70 disabled:opacity-100"
          />
        </motion.div>

        {!locked && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(a)}
                  className="grid size-9 place-items-center rounded-lg bg-paper-2 text-[16px] text-ink-2 transition-colors hover:bg-line active:scale-95"
                >
                  {a}
                </button>
              ))}
            </div>
            {step.hint && !hint && (
              <button
                type="button"
                onClick={() => setHint(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-3 hover:text-ink-2"
              >
                <IconLightbulb size={15} /> Hint
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {hint && step.hint && !locked && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-[15px] text-ink-2"
            >
              <span className="mr-1">💡</span>
              <Rich text={step.hint} />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
