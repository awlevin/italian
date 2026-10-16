"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ChoiceStep, ListenStep } from "@/content/types";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";
import { IconCheck, IconX } from "@/components/ui/icons";
import { speak } from "@/lib/audio";
import { plain } from "@/lib/text";
import { Prompt, Sentence } from "./prompt";
import type { ExerciseProps } from "./types";
import { AFTER_CHIME_MS, useLater } from "./use-later";

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
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      // Not while the learner has stepped back to an earlier card.
      if (!grid.current?.offsetParent) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, onPick, options.length]);

  return (
    <div ref={grid} className="grid gap-2.5" data-reveal>
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
                : state === "right"
                  ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                  : { opacity: state === "dim" ? 0.45 : 1, y: 0 }
            }
            transition={{
              delay: !locked ? 0.05 * i : state === "right" && !isPicked ? 0.3 : 0,
              duration: state === "wrong" ? 0.4 : 0.3,
            }}
            whileTap={locked ? undefined : { scale: 0.98 }}
            aria-keyshortcuts={String(i + 1)}
            className={`group flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] transition-colors ${
              state === "right"
                ? "border-ok bg-ok-soft text-ink"
                : state === "wrong"
                  ? "border-wrong bg-wrong-soft text-ink"
                  : "border-line bg-card text-ink hover:border-ink-3/50"
            } shadow-[0_2px_0_var(--line)]`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-bold transition-colors ${
                state === "right"
                  ? "bg-ok text-card"
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
  const later = useLater();
  const locked = phase !== "answering";
  const right = plain(step.options[step.answer]);
  const blank = step.it?.includes("___") ?? false;
  const full = step.it?.replace("___", right);

  const pick = (i: number) => {
    if (locked) return;
    setPicked(i);
    submit({ correct: i === step.answer, answer: right });
    if (full) later(() => speak(full), AFTER_CHIME_MS);
  };

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Choose" text={step.prompt} />
      {step.it && full && (
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Sentence
              text={step.it}
              fill={locked && blank ? right : undefined}
              state={locked ? (picked === step.answer ? "correct" : "wrong") : "empty"}
              struck={locked && picked !== null && picked !== step.answer ? plain(step.options[picked]) : undefined}
            />
          </div>
          {locked || !blank ? <SpeakButton text={full} className="mt-0.5" /> : null}
        </div>
      )}
      <OptionList options={step.options} answer={step.answer} picked={picked} onPick={pick} locked={locked} />
    </div>
  );
}

/** The transcript, hidden as a row of bars shaped like its words until the learner answers. */
function Transcript({ text, shown }: { text: string; shown: boolean }) {
  const words = `“${text}”`.split(" ");
  return (
    <p
      lang="it"
      className="text-center font-display text-[22px] leading-snug text-ink text-balance"
      aria-hidden={!shown}
      aria-label={shown ? text : undefined}
    >
      {words.map((w, i) => (
        <span key={i}>
          <span className="relative inline-block">
            <motion.span
              initial={false}
              animate={{ opacity: shown ? 1 : 0, filter: shown ? "blur(0px)" : "blur(4px)" }}
              transition={{ delay: shown ? 0.05 + i * 0.045 : 0, duration: 0.3 }}
            >
              {w}
            </motion.span>
            <motion.span
              aria-hidden
              initial={false}
              animate={{ opacity: shown ? 0 : 1, scaleX: shown ? 0.4 : 1 }}
              transition={{ delay: shown ? i * 0.045 : 0, duration: 0.25 }}
              className="absolute inset-x-[0.06em] top-[0.42em] bottom-[0.3em] rounded-full bg-line"
            />
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </p>
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
      <div className="flex flex-col items-center gap-3 py-1">
        <SpeakButton text={step.text} size="lg" autoPlay label="Play the Italian" />
        <p className="text-[13px] text-ink-3">Tap again to hear it slower</p>
        <div className="pt-2">
          <Transcript text={step.text} shown={locked} />
        </div>
      </div>
      <OptionList options={step.options} answer={step.answer} picked={picked} onPick={pick} locked={locked} />
    </div>
  );
}
