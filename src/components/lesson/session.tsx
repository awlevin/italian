"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Step } from "@/content/types";
import { isExercise } from "@/content/types";
import type { Phase, Verdict } from "@/components/exercises/types";
import { IconX } from "@/components/ui/icons";
import { preload, stop } from "@/lib/audio";
import { sfx } from "@/lib/sfx";
import { Footer } from "./feedback";
import { Rail } from "./rail";
import { StepView } from "./step-view";

export interface SessionItem {
  /** Unique key within the session. */
  key: string;
  step: Step;
  /** Optional context label shown above the step (e.g. the lesson in review mode). */
  label?: string;
}

export interface SessionResult {
  exercises: number;
  firstTryCorrect: number;
}

/**
 * Runs a sequence of steps: one card at a time, check → verdict → continue.
 * Missed exercises come back at the end, so every session finishes on a win.
 */
export function Session({
  items,
  startAt = 0,
  exitHref = "/",
  onAnswer,
  onAdvance,
  onFinish,
}: {
  items: SessionItem[];
  startAt?: number;
  exitHref?: string;
  onAnswer: (item: SessionItem, correct: boolean) => void;
  /** Called with the next original index whenever the learner moves forward. */
  onAdvance?: (nextIndex: number) => void;
  onFinish: (r: SessionResult) => void;
}) {
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i).slice(startAt));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [canCheck, setCanCheck] = useState(false);
  const grader = useRef<(() => Verdict) | null>(null);
  const firstTry = useRef(new Map<number, boolean>());
  const finished = useRef(false);

  const index = queue[pos];
  const item = items[index];
  const step = item?.step;
  const exercise = step ? isExercise(step) : false;
  const total = queue.length;

  useEffect(() => {
    const upcoming = queue.slice(pos, pos + 3).map((i) => items[i]?.step);
    const texts: string[] = [];
    for (const s of upcoming) {
      if (!s) continue;
      if (s.kind === "listen") texts.push(s.text);
      if (s.kind === "build") texts.push(s.answer);
      if (s.kind === "teach") s.examples?.forEach((e) => texts.push(e.it));
      if (s.kind === "morph") s.pairs.forEach((p) => texts.push(p.it));
    }
    preload(texts);
  }, [pos, queue, items]);

  const setGrader = useCallback((g: (() => Verdict) | null) => {
    grader.current = g;
    setCanCheck(!!g);
  }, []);

  const submit = useCallback(
    (v: Verdict) => {
      if (phase !== "answering" || !item) return;
      setVerdict(v);
      setPhase(v.correct ? "correct" : "wrong");
      if (v.correct) sfx.correct();
      else sfx.wrong();
      if (!firstTry.current.has(index)) firstTry.current.set(index, v.correct);
      onAnswer(item, v.correct);
    },
    [phase, item, index, onAnswer],
  );

  const check = useCallback(() => {
    if (grader.current) submit(grader.current());
  }, [submit]);

  const advance = useCallback(() => {
    stop();
    const requeue = phase === "wrong";
    const nextQueue = requeue ? [...queue, index] : queue;
    if (requeue) setQueue(nextQueue);
    const nextPos = pos + 1;
    // Report progress against the original order (never moves backwards).
    const furthest = Math.max(...nextQueue.slice(0, nextPos).filter((i) => i < items.length)) + 1;
    onAdvance?.(Math.min(furthest, items.length));
    if (nextPos >= nextQueue.length) {
      if (finished.current) return;
      finished.current = true;
      const results = [...firstTry.current.values()];
      onFinish({ exercises: results.length, firstTryCorrect: results.filter(Boolean).length });
      return;
    }
    grader.current = null;
    setCanCheck(false);
    setVerdict(null);
    setPhase("answering");
    setPos(nextPos);
  }, [phase, queue, index, pos, items.length, onAdvance, onFinish]);

  const primary =
    phase !== "answering"
      ? { label: "Continue", onClick: advance }
      : !exercise
        ? { label: step?.kind === "morph" ? "Got the pattern" : "Capito!", onClick: advance }
        : step?.kind === "type" || step?.kind === "build"
          ? { label: "Check", onClick: check, disabled: !canCheck }
          : null;

  // Enter = the primary action. Ignore when focus is on a button (it clicks itself).
  const onEnter = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.repeat) return;
    if (document.activeElement instanceof HTMLButtonElement) return;
    if (primary && !primary.disabled) {
      e.preventDefault();
      primary.onClick();
    }
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onEnter(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!step) return null;
  const explain = exercise && "explain" in step ? step.explain : undefined;

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <Link
            href={exitHref}
            onClick={() => stop()}
            aria-label="Leave"
            className="-ml-2 grid size-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <IconX size={22} />
          </Link>
          <Rail value={(pos + (phase === "answering" ? 0 : 1)) / total} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-4 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${pos}-${item.key}`}
            initial={{ opacity: 0, x: 36, rotate: 0.6 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -36, rotate: -0.6, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {item.label && (
              <p className="mb-3 inline-flex rounded-full bg-paper-2 px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.14em] text-ink-3 uppercase">
                {item.label}
              </p>
            )}
            <StepView step={step} phase={phase} setGrader={setGrader} submit={submit} />
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="sticky bottom-0">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-paper to-transparent" />
        <div className="bg-paper">
          <Footer seed={pos} phase={phase} verdict={verdict} explain={explain} primary={primary} />
        </div>
      </div>
    </div>
  );
}
