"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ChoiceStep, ListenStep } from "@/content/types";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";
import { IconCheck, IconX } from "@/components/ui/icons";
import { speak } from "@/lib/audio";
import { plain } from "@/lib/text";
import { Prompt, Sentence } from "./prompt";
import type { ExerciseProps } from "./types";

export function OptionList({
  options,
  answer,
  picked,
  onPick,
  locked,
}: {
  options: string[];
  answer: number;
  picked: number | null;
  onPick: (i: number) => void;
  locked: boolean;
}) {
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, onPick, options.length]);

  return (
    <div className="grid gap-2.5">
      {options.map((o, i) => {
        const isPicked = picked === i;
        const isAnswer = i === answer;
        const state = !locked ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
        return (
          <motion.button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => onPick(i)}
            initial={{ opacity: 0, y: 10 }}
            animate={
              state === "wrong"
                ? { opacity: 1, y: 0, x: [0, -7, 7, -5, 5, 0] }
                : state === "right" && isPicked
                  ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                  : { opacity: state === "dim" ? 0.45 : 1, y: 0 }
            }
            transition={{ delay: locked ? 0 : 0.05 * i, duration: state === "wrong" ? 0.4 : 0.3 }}
            whileTap={locked ? undefined : { scale: 0.98 }}
            className={`group flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] transition-colors ${
              state === "right"
                ? "border-olive bg-olive-soft text-ink"
                : state === "wrong"
                  ? "border-wrong bg-wrong-soft text-ink"
                  : "border-line bg-card text-ink hover:border-ink-3/50"
            } shadow-[0_2px_0_var(--line)]`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-bold transition-colors ${
                state === "right"
                  ? "bg-olive text-card"
                  : state === "wrong"
                    ? "bg-wrong text-card"
                    : "bg-paper-2 text-ink-3 group-hover:text-ink-2"
              }`}
            >
              {state === "right" ? <IconCheck size={15} strokeWidth={3} /> : state === "wrong" ? <IconX size={15} strokeWidth={3} /> : i + 1}
            </span>
            <span className="flex-1 leading-snug">
              <Rich text={o} speakable={false} />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function Choice({ step, phase, submit }: ExerciseProps<ChoiceStep>) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = phase !== "answering";
  const filled = useMemo(
    () => (step.it && picked !== null ? step.it.replace("___", plain(step.options[step.answer])) : step.it),
    [step, picked],
  );

  const pick = (i: number) => {
    if (locked) return;
    setPicked(i);
    const correct = i === step.answer;
    submit({ correct, answer: plain(step.options[step.answer]) });
    if (step.it) speak(step.it.replace("___", plain(step.options[step.answer])));
  };

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Choose" text={step.prompt} />
      {step.it && (
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Sentence
              text={step.it}
              fill={locked && step.it.includes("___") ? plain(step.options[step.answer]) : undefined}
              state={locked ? (picked === step.answer ? "correct" : "wrong") : "empty"}
            />
          </div>
          {locked || !step.it.includes("___") ? <SpeakButton text={filled ?? step.it} /> : null}
        </div>
      )}
      <OptionList options={step.options} answer={step.answer} picked={picked} onPick={pick} locked={locked} />
    </div>
  );
}

export function Listen({ step, phase, submit }: ExerciseProps<ListenStep>) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = phase !== "answering";

  const pick = (i: number) => {
    if (locked) return;
    setPicked(i);
    submit({ correct: i === step.answer, answer: plain(step.options[step.answer]) });
  };

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Listen" text={step.prompt} />
      <div className="flex flex-col items-center gap-3 py-2">
        <SpeakButton text={step.text} size="lg" autoPlay label="Play the Italian" />
        <p className="text-[13px] text-ink-3">Tap again to hear it slower</p>
        <motion.p
          lang="it"
          initial={false}
          animate={{ opacity: locked ? 1 : 0, filter: locked ? "blur(0px)" : "blur(6px)", y: locked ? 0 : 4 }}
          className="min-h-8 text-center font-display text-[22px] leading-snug text-ink text-balance"
          aria-hidden={!locked}
        >
          {locked ? `“${step.text}”` : "·  ·  ·"}
        </motion.p>
      </div>
      <OptionList options={step.options} answer={step.answer} picked={picked} onPick={pick} locked={locked} />
    </div>
  );
}
