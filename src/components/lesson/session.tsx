"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Step } from "@/content/types";
import { isExercise } from "@/content/types";
import type { Phase, Verdict } from "@/components/exercises/types";
import { Button } from "@/components/ui/button";
import { IconList, IconRepeat, IconX } from "@/components/ui/icons";
import { preload, stop } from "@/lib/audio";
import { sfx } from "@/lib/sfx";
import { Footer } from "./feedback";
import { LessonPlan, type PlanRow } from "./plan";
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

interface Past {
  phase: Phase;
  verdict: Verdict | null;
}

/** Cards stay mounted once seen, so stepping back finds them as they were left. */
const noGrader = () => {};
const noSubmit = () => {};

/**
 * Runs a sequence of steps: one card at a time, check → verdict → continue.
 * Missed exercises come back at the end, so every session finishes on a win.
 * The learner can step back through cards already seen, verdict and all, then forward again.
 */
export function Session({
  items,
  startAt = 0,
  exitHref = "/",
  planTitle,
  onAnswer,
  onAdvance,
  onFinish,
}: {
  items: SessionItem[];
  startAt?: number;
  exitHref?: string;
  /** Shows the lesson plan button. Items are the whole lesson, in order. */
  planTitle?: string;
  onAnswer: (item: SessionItem, correct: boolean) => void;
  /** Called with the next original index whenever the learner moves forward. */
  onAdvance?: (nextIndex: number) => void;
  onFinish: (r: SessionResult) => void;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i).slice(startAt));
  const [firstPass] = useState(() => items.length - startAt);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [canCheck, setCanCheck] = useState(false);
  /** Cards put behind us for good. Drives the rail, so the train never rolls backwards. */
  const [cleared, setCleared] = useState(0);
  const [misses, setMisses] = useState(0);
  const [sheet, setSheet] = useState<{ height: number; lift: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  /** A card behind the live one that the learner stepped back to, or null. */
  const [view, setView] = useState<number | null>(null);
  /** How each card behind us ended, by queue position. */
  const [past, setPast] = useState<Past[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const grader = useRef<(() => Verdict) | null>(null);
  const firstTry = useRef(new Map<number, boolean>());
  const finished = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const index = queue[pos];
  const item = items[index];
  const step = item?.step;
  const exercise = step ? isExercise(step) : false;
  const retry = pos >= firstPass;
  const looking = view !== null;
  const shown = view ?? pos;
  const shownStep = items[queue[shown]]?.step;
  const shownPhase = looking ? past[view].phase : phase;
  const shownVerdict = looking ? past[view].verdict : verdict;
  const answered = shownPhase !== "answering";

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
      else {
        sfx.wrong();
        setMisses((m) => m + 1);
      }
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
    setPast((p) => {
      const next = [...p];
      next[pos] = { phase, verdict };
      return next;
    });
    const requeue = phase === "wrong";
    const nextQueue = requeue ? [...queue, index] : queue;
    if (requeue) setQueue(nextQueue);
    else setCleared((c) => c + 1);
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
    setSheet(null);
    setPhase("answering");
    setPos(nextPos);
  }, [phase, verdict, queue, index, pos, items.length, onAdvance, onFinish]);

  const goTo = useCallback(
    (p: number) => {
      stop();
      setView(p >= pos ? null : Math.max(0, p));
    },
    [pos],
  );
  const back = shown > 0 ? () => goTo(shown - 1) : undefined;

  const primary = looking
    ? { label: view === pos - 1 ? "Back to the current card" : "Next card", onClick: () => goTo(view + 1) }
    : phase !== "answering"
      ? { label: "Continue", onClick: advance }
      : !exercise
        ? { label: step?.kind === "morph" ? "Got the pattern" : "Capito!", onClick: advance }
        : step?.kind === "type" || step?.kind === "build"
          ? { label: "Check", onClick: check, disabled: !canCheck }
          : null;

  // Enter = the primary action. Ignore when focus is on a button (it clicks itself).
  // ←/→ step through cards already seen, unless the learner is typing.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (planOpen) return;
    if (e.key === "Escape" && leaving) return setLeaving(false);
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    if (!typing && !leaving && !e.metaKey && !e.altKey) {
      if (e.key === "ArrowLeft" && back) return back();
      if (e.key === "ArrowRight" && looking) return goTo(shown + 1);
    }
    if (e.key !== "Enter" || e.repeat || leaving) return;
    if (document.activeElement instanceof HTMLButtonElement) return;
    if (primary && !primary.disabled) {
      e.preventDefault();
      primary.onClick();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onSheetHeight = useCallback((height: number) => {
    setSheet({ height, lift: Math.max(0, height - (footerRef.current?.offsetHeight ?? 0)) });
  }, []);

  // Keep what the verdict is about (options, answer, tiles) in view above the sheet.
  useEffect(() => {
    if (!answered || !sheet) return;
    const id = requestAnimationFrame(() => {
      const card = mainRef.current?.querySelector("[data-shown]");
      const target = card?.querySelector("[data-reveal]") ?? card?.firstElementChild;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const top = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
      const limit = window.innerHeight - sheet.height - 16;
      const delta = Math.min(r.bottom - limit, r.top - top);
      if (delta > 1) window.scrollBy({ top: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [answered, sheet, shown]);

  useEffect(() => window.scrollTo({ top: 0 }), [shown]);

  const closePlan = useCallback(() => setPlanOpen(false), []);

  const leave = () => {
    stop();
    router.push(exitHref);
  };

  if (!step || !shownStep) return null;
  const explain = isExercise(shownStep) && "explain" in shownStep ? shownStep.explain : undefined;
  const progress = (startAt + cleared + (phase === "correct" ? 1 : 0)) / items.length;
  const hasProgress = pos > 0 || answered;
  const resumeCard = Math.max(...queue.slice(0, pos + 1).filter((i) => i < items.length)) + 1;
  const history = queue.slice(0, pos + 1);

  let planRows: PlanRow[] = [];
  if (planTitle) {
    const seenAt = new Map<number, number>();
    history.forEach((i, p) => seenAt.set(i, p));
    const open = (p: number) => () => {
      setPlanOpen(false);
      goTo(p);
    };
    planRows = items.map((it, i): PlanRow => {
      const at = seenAt.get(i);
      if (i === index)
        return { step: it.step, state: "current", action: looking ? { label: "Back to this card", onClick: open(pos) } : undefined };
      return {
        step: it.step,
        state: at !== undefined || i < startAt ? "done" : "todo",
        action: at !== undefined ? { label: "Go to this card", onClick: open(at) } : undefined,
      };
    });
  }

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header ref={headerRef} className="sticky top-0 z-30 bg-paper">
        {/* Content scrolling under the header fades out instead of being cut. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-5"
          style={{ background: "linear-gradient(to bottom, var(--paper), transparent)" }}
        />
        <div className="relative mx-auto flex max-w-xl items-center gap-4 px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={() => (hasProgress ? setLeaving((l) => !l) : leave())}
            aria-label="Leave"
            aria-expanded={hasProgress ? leaving : undefined}
            className="-ml-2 grid size-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <IconX size={22} />
          </button>
          <Rail value={progress} jolt={misses} />
          {planTitle && (
            <button
              type="button"
              onClick={() => setPlanOpen(true)}
              aria-label="Lesson plan"
              className="-mr-2 grid size-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <IconList size={22} />
            </button>
          )}

          <AnimatePresence>
            {leaving && (
              <motion.div
                role="dialog"
                aria-label="Leave the lesson?"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                className="absolute top-full left-3 z-50 w-[min(21rem,calc(100vw-1.5rem))] origin-top-left rounded-[22px] border border-line bg-card p-4 shadow-lift"
              >
                <p className="font-display text-[21px] leading-tight text-ink">Hop off here?</p>
                <p className="mt-1 text-[15px] leading-snug text-ink-2">
                  {onAdvance && !retry
                    ? `Your seat is saved. You'll pick up at card ${resumeCard}.`
                    : "Every answer so far is saved."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={leave}>
                    Leave
                  </Button>
                  <Button autoFocus onClick={() => setLeaving(false)}>
                    Keep going
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      <AnimatePresence>
        {leaving && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLeaving(false)}
            className="fixed inset-0 z-20 bg-paper/60 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <main
        ref={mainRef}
        className="mx-auto w-full max-w-xl flex-1 px-5 pt-4 pb-6"
        style={answered && sheet ? { paddingBottom: sheet.lift + 24 } : undefined}
      >
        {history.map((qi, p) => {
          const card = items[qi];
          const here = p === shown;
          const live = p === pos;
          const again = p >= firstPass;
          return (
            <motion.div
              key={`${p}-${card.key}`}
              hidden={!here}
              data-shown={here || undefined}
              initial={p === 0 ? false : { opacity: 0, x: 36, rotate: 0.6 }}
              animate={here ? { opacity: 1, x: 0, rotate: 0 } : { opacity: 0, x: p < shown ? -36 : 36, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              {(card.label || again || !live) && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {!live && (
                    <p className="inline-flex items-center rounded-full bg-bridge-soft px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.14em] text-bridge uppercase">
                      Looking back · card {qi + 1}
                    </p>
                  )}
                  {again && (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-mark-soft px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.14em] text-ink-2 uppercase">
                      <IconRepeat size={12} strokeWidth={2.5} /> Again
                    </p>
                  )}
                  {card.label && (
                    <p className="inline-flex rounded-full bg-paper-2 px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.14em] text-ink-3 uppercase">
                      {card.label}
                    </p>
                  )}
                </div>
              )}
              <StepView
                step={card.step}
                phase={live ? phase : past[p].phase}
                setGrader={live ? setGrader : noGrader}
                submit={live ? submit : noSubmit}
              />
            </motion.div>
          );
        })}
      </main>

      <div ref={footerRef} className="sticky bottom-0 z-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 h-8"
          style={{ background: "linear-gradient(to top, var(--paper), transparent)" }}
        />
        <div className="bg-paper">
          <Footer
            seed={shown}
            phase={shownPhase}
            verdict={shownVerdict}
            explain={explain}
            primary={primary}
            back={back}
            onSheetHeight={onSheetHeight}
          />
        </div>
      </div>
      {planTitle && (
        <LessonPlan open={planOpen} title={planTitle} rows={planRows} onClose={closePlan} />
      )}
    </div>
  );
}
