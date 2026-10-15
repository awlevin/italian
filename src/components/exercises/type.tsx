"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { TypeStep } from "@/content/types";
import { IconLightbulb } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";
import { charDiff } from "@/lib/diff";
import { speak } from "@/lib/audio";
import { gradeTyped, plain } from "@/lib/text";
import { Prompt, Sentence } from "./prompt";
import type { ExerciseProps } from "./types";
import { AFTER_CHIME_MS, useLater } from "./use-later";

const ACCENTS = ["à", "è", "é", "ì", "ò", "ù"];

const same = (a: string, b: string) => a.normalize("NFC").toLowerCase() === b.normalize("NFC").toLowerCase();

/**
 * The learner's attempt, corrected in place: extra letters struck in red,
 * missing letters dropped in, accent slips underlined. Reads as "what was off".
 */
export function Correction({ attempt, answer }: { attempt: string; answer: string }) {
  const tokens = useMemo(() => charDiff(attempt, answer), [attempt, answer]);
  const label = `You wrote ${attempt}. Correct: ${answer}`;
  const kept = tokens.filter((t) => t.type === "keep").length;
  // Too far off for a letter diff to help: show the attempt struck, then the answer.
  if (kept < answer.length * 0.4)
    return (
      <span className="flex items-baseline gap-2" aria-label={label}>
        <s aria-hidden className="text-wrong/80 decoration-wrong/70 decoration-2">
          {attempt}
        </s>
        <motion.span
          aria-hidden
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="font-semibold text-ok"
        >
          {answer}
        </motion.span>
      </span>
    );
  let n = 0;
  return (
    <span className="whitespace-pre" aria-label={label}>
      {tokens.map((t) => {
        if (t.type === "keep" && same(t.src ?? t.ch, t.ch))
          return (
            <span key={t.key} aria-hidden>
              {t.ch}
            </span>
          );
        const delay = 0.18 + 0.07 * n++;
        if (t.type === "del")
          return (
            <span key={t.key} aria-hidden className="relative mx-px inline-block text-[0.85em] text-wrong/75">
              {t.ch === " " ? " " : t.ch}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay, duration: 0.18, ease: "easeOut" }}
                className="absolute inset-x-[-1px] top-[55%] h-[2px] origin-left rounded-full bg-wrong"
              />
            </span>
          );
        return (
          <motion.span
            key={t.key}
            aria-hidden
            initial={{ opacity: 0, y: -10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 22, delay }}
            className="inline-block font-semibold text-ok underline decoration-ok/40 decoration-2 underline-offset-[5px]"
          >
            {t.ch === " " ? " " : t.ch}
          </motion.span>
        );
      })}
    </span>
  );
}

export function TypeAnswer({ step, phase, setGrader }: ExerciseProps<TypeStep>) {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const locked = phase !== "answering";
  const graded = useMemo(() => gradeTyped(value, step.answers), [value, step.answers]);
  const target = plain(graded.match);
  const spoken = step.it ? step.it.replace("___", target) : target;
  const later = useLater();

  useEffect(() => {
    const id = setTimeout(() => input.current?.focus({ preventScroll: true }), 380);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!value.trim()) return setGrader(null);
    setGrader(() => {
      if (graded.grade === "exact") return { correct: true };
      if (graded.grade === "accent") return { correct: true, note: `Mind the accent: «${target}»` };
      return { correct: false };
    });
  }, [value, graded, target, setGrader]);

  // Hear the right answer once the verdict chime has rung.
  const sayAnswer = useEffectEvent(() => later(() => speak(spoken), AFTER_CHIME_MS));
  useEffect(() => {
    if (locked) sayAnswer();
  }, [locked]);

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

  const typed = value.trim().replace(/\s+/g, " ");
  const showFix = locked && graded.grade !== "exact";

  return (
    <div className="space-y-6">
      <Prompt eyebrow="Type" text={step.prompt} />
      {step.it && (
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Sentence
              text={step.it}
              fill={locked ? target : typed || undefined}
              state={phase === "correct" ? "correct" : phase === "wrong" ? "wrong" : "empty"}
            />
          </div>
          {locked && <SpeakButton text={spoken} className="mt-0.5" />}
        </div>
      )}

      <div className="space-y-2.5" data-reveal>
        <motion.div
          animate={phase === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className={`relative flex items-center gap-3 rounded-2xl border-2 bg-card px-4 transition-colors focus-within:border-bridge ${
            phase === "correct" ? "border-ok" : phase === "wrong" ? "border-wrong" : "border-line"
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
            className={`h-14 w-full bg-transparent text-[19px] text-ink outline-none placeholder:text-ink-3/70 disabled:opacity-100 ${showFix ? "text-transparent" : ""}`}
          />
          {showFix && (
            <span
              className={`pointer-events-none absolute inset-y-0 left-4 flex items-center overflow-hidden text-[19px] text-ink ${step.it ? "right-4" : "right-14"}`}
              lang="it"
            >
              <Correction attempt={typed} answer={target} />
            </span>
          )}
          {!step.it && locked && <SpeakButton text={spoken} size="sm" className="shrink-0" />}
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
                  aria-label={`Insert ${a}`}
                  className="grid size-10 place-items-center rounded-xl bg-paper-2 text-[17px] text-ink-2 shadow-[0_2px_0_var(--line)] transition-[transform,box-shadow,background-color] hover:bg-line active:translate-y-[2px] active:shadow-none"
                >
                  {a}
                </button>
              ))}
            </div>
            {step.hint && !hint && (
              <button
                type="button"
                onClick={() => setHint(true)}
                className="flex h-10 items-center gap-1 rounded-xl px-2 text-[13px] font-medium text-ink-3 hover:text-ink-2"
              >
                <IconLightbulb size={15} /> Hint
              </button>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {hint && step.hint && !locked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="flex items-center gap-2 rounded-xl bg-mark-soft px-3 py-2 text-[15px] text-ink-2">
                <IconLightbulb size={16} className="shrink-0 text-ink-3" />
                <span>
                  <Rich text={step.hint} />
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
