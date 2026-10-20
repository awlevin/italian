"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { itemId, lineOf } from "@/content/course";
import type { Lesson } from "@/content/types";
import { isExercise } from "@/content/types";
import { useAddedPhrases } from "@/components/added-phrases";
import { Splash } from "@/components/auth-gate";
import { useDispatch, useProgress, useProgressReady } from "@/components/progress/provider";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconList } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";
import { sfx } from "@/lib/sfx";
import { LessonPlan, type PlanRow } from "./plan";
import { Rail } from "./rail";
import { Session, type SessionItem, type SessionResult } from "./session";
import { Ticket } from "./ticket";
import { YourPhrasesContext } from "./your-phrases";
import { useT } from "@/lib/locale";
import { byRule } from "@/lib/phrase-cards";

type Stage = "intro" | "run" | "done";

/** Where a rule link may send the learner back to. */
const BACK = ["/phrasebook", "/phrasebook/grammar", "/review"] as const;

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const ready = useProgressReady();
  const t = useT();
  const progress = useProgress();
  const dispatch = useDispatch();
  const router = useRouter();
  const saved = progress.lessons[lesson.id];
  // ?step=<id> opens the lesson running at that card (a rule linked from Review).
  // It is a look at one card, so it never moves the saved seat.
  const params = useSearchParams();
  const stepParam = params.get("step");
  // Only the screens that link here: never a URL from outside.
  const back = BACK.find((b) => b === params.get("back"));
  const [deepAt] = useState(() => (stepParam ? lesson.steps.findIndex((s) => s.id === stepParam) : -1));
  const deep = deepAt >= 0;
  const [stage, setStage] = useState<Stage>(deep ? "run" : "intro");
  const [startAt, setStartAt] = useState(deep ? deepAt : 0);
  const [peek, setPeek] = useState(deep);
  const { phrases } = useAddedPhrases();
  const yours = useMemo(() => {
    const byStep = new Map<string, typeof phrases>();
    for (const [rule, entries] of byRule(phrases)) {
      const [lessonId, stepId] = rule.split("/");
      if (lessonId === lesson.id) byStep.set(stepId, entries);
    }
    return byStep;
  }, [phrases, lesson.id]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const line = lineOf(lesson.id).lessons;
  const idx = line.findIndex((l) => l.id === lesson.id);
  const prev = line[idx - 1];
  const next = line[idx + 1];
  const items = useMemo<SessionItem[]>(() => lesson.steps.map((step) => ({ key: step.id, step })), [lesson]);
  // Warm both ways off the finish screen while the learner reads it, and show a
  // spinner on whichever one they tap until the next page is in.
  useEffect(() => {
    if (stage !== "done") return;
    router.prefetch("/");
    if (next) router.prefetch(`/lesson/${next.id}`);
  }, [stage, next, router]);
  const [going, startGoing] = useTransition();
  const [goingTo, setGoingTo] = useState<string | null>(null);
  const go = (href: string) => {
    setGoingTo(href);
    startGoing(() => router.push(href));
  };
  const exerciseCount = lesson.steps.filter(isExercise).length;
  const resumeAt = saved && !saved.completedAt && saved.stepIndex > 0 && saved.stepIndex < lesson.steps.length ? saved.stepIndex : 0;

  const begin = (at: number) => {
    setPlanOpen(false);
    setPeek(false);
    setStartAt(at);
    setStage("run");
    if (at === 0) dispatch({ t: "lesson", lessonId: lesson.id, stepIndex: 0 });
  };

  const closePlan = useCallback(() => setPlanOpen(false), []);
  const planTitle = `${lesson.city} · ${lesson.title}`;
  const reached = stage === "done" || saved?.completedAt ? lesson.steps.length : (saved?.stepIndex ?? 0);
  const planRows: PlanRow[] = lesson.steps.map((step, i) => ({
    step,
    state: i < reached ? "done" : i === resumeAt && resumeAt > 0 ? "current" : "todo",
    action: ready ? { label: i === 0 ? "Start from the beginning" : "Start from this card", onClick: () => begin(i) } : undefined,
  }));

  const onAnswer = useCallback(
    (item: SessionItem, correct: boolean) => {
      // A look ahead doesn't schedule cards from a lesson that hasn't been taught yet.
      if (!peek) dispatch({ t: "answer", itemId: itemId(lesson.id, item.step.id), correct });
    },
    [dispatch, lesson.id, peek],
  );
  const onAdvance = useCallback(
    (stepIndex: number) => dispatch({ t: "lesson", lessonId: lesson.id, stepIndex }),
    [dispatch, lesson.id],
  );
  const onFinish = useCallback(
    (r: SessionResult) => {
      // A look from a deep link skipped the start: it doesn't finish the lesson. Back to where it came from.
      if (peek) {
        if (back) return router.push(back);
        setPeek(false);
        return setStage("intro");
      }
      const accuracy = r.exercises ? r.firstTryCorrect / r.exercises : 1;
      dispatch({ t: "lesson", lessonId: lesson.id, stepIndex: lesson.steps.length, completed: true, accuracy });
      setResult(r);
      setStage("done");
      sfx.done();
    },
    [dispatch, lesson, peek, back, router],
  );

  return (
    <>
      {stage === "run" && peek && !ready ? (
        // Answers need the progress store; it is usually there from the device at once.
        <Splash />
      ) : stage === "run" ? (
        <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <YourPhrasesContext value={yours}>
            <Session
              items={items}
              startAt={startAt}
              planTitle={planTitle}
              onAnswer={onAnswer}
              onAdvance={peek ? undefined : onAdvance}
              exitHref={peek ? back : undefined}
              onFinish={onFinish}
            />
          </YourPhrasesContext>
        </motion.div>
      ) : stage === "intro" ? (
        <motion.main
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <Link href="/" className="-ml-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-2 text-[14px] font-medium text-ink-3 hover:text-ink">
            <IconArrowLeft size={18} /> {t("Lessons", "Il viaggio")}
          </Link>

          <div className="flex flex-1 flex-col justify-center gap-7 py-10">
            <div className="space-y-3">
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-[11px] font-bold tracking-[0.2em] text-accent uppercase"
              >
                Fermata {idx + 1} · {lesson.region}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 26 }}
                className="font-display-wonk text-[64px] leading-[0.9] tracking-[-0.035em] text-ink"
              >
                {lesson.city}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="space-y-1 pt-1"
              >
                <p className="font-display text-[24px] leading-tight text-ink italic">{lesson.title}</p>
                <p className="text-[16px] text-ink-2">{lesson.subtitle}</p>
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-[34ch] text-[17px] leading-relaxed text-ink-2 text-pretty"
            >
              <Rich text={lesson.summary} />
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26 }}
              className="flex gap-5 font-mono text-[12px] text-ink-3"
            >
              <span>{lesson.steps.length} cards</span>
              <span>{exerciseCount} exercises</span>
              <span>~{Math.max(5, Math.round(lesson.steps.length * 0.5))} min</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            {resumeAt > 0 ? (
              <>
                <Button size="lg" block onClick={() => begin(resumeAt)} disabled={!ready}>
                  {t("Resume", "Riprendi")} · card {resumeAt + 1} of {lesson.steps.length}
                </Button>
                <Button size="md" variant="ghost" block onClick={() => begin(0)}>
                  Start from the beginning
                </Button>
              </>
            ) : (
              <Button size="lg" block onClick={() => begin(0)} disabled={!ready}>
                {saved?.completedAt ? "Ride again" : t("Start", "Partenza!")} <IconArrowRight size={20} />
              </Button>
            )}
            <Button size="md" variant="ghost" block onClick={() => setPlanOpen(true)}>
              <IconList size={18} /> Lesson plan
            </Button>
            {(prev || next) && (
              <nav aria-label="Other stops" className="flex items-center justify-between gap-3 pt-2 text-[14px] font-medium text-ink-3">
                {prev ? (
                  <Link href={`/lesson/${prev.id}`} className="-ml-2 inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-2 hover:text-ink">
                    <IconArrowLeft size={16} className="shrink-0" />
                    <span className="truncate">{prev.city}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={`/lesson/${next.id}`} className="-mr-2 inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-2 hover:text-ink">
                    <span className="truncate">{next.city}</span>
                    <IconArrowRight size={16} className="shrink-0" />
                  </Link>
                )}
              </nav>
            )}
          </motion.div>
        </motion.main>
      ) : (
        <motion.main
          key="done"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <div className="space-y-2 text-center">
            {/* The train from the lesson rolls the last stretch into the station. */}
            <div className="mx-auto flex max-w-[13rem] pr-4 pb-3" aria-hidden>
              <Rail value={1} from={0.5} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-mono text-[11px] font-bold tracking-[0.2em] text-ok uppercase"
            >
              Arrivati a {lesson.city}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.55 }}
              className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]"
            >
              {t("Well done!", "Ben fatto!")}
            </motion.h1>
          </div>

          <div className="py-8">
            <Ticket
              from={prev?.city ?? "Casa"}
              to={lesson.city}
              accuracy={result && result.exercises ? result.firstTryCorrect / result.exercises : 1}
            />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="space-y-3"
          >
            <Button size="md" variant="secondary" block onClick={() => setPlanOpen(true)} className="mb-5">
              <IconList size={18} /> Look back over every card
            </Button>
            <h2 className="font-mono text-[11px] font-bold tracking-[0.18em] text-ink-3 uppercase">Words from this stop</h2>
            <ul className="divide-y divide-line/70 rounded-2xl border border-line bg-card px-4 shadow-card">
              {lesson.vocab.map((v, i) => (
                <motion.li
                  key={v.it}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 + Math.min(i, 8) * 0.04 }}
                  className="flex items-center gap-3 py-2.5"
                >
                  <SpeakButton text={v.it} size="sm" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block font-semibold text-ink" lang="it">
                      {v.it}
                    </span>
                    {v.es && (
                      <span className="block text-[13px] text-bridge italic" lang="es">
                        {v.es}
                      </span>
                    )}
                  </span>
                  <span className="max-w-[45%] text-right text-[14px] leading-snug text-ink-2">{v.en}</span>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            className="sticky bottom-0 mt-8 space-y-2 pt-6 pb-[env(safe-area-inset-bottom)]"
            style={{ background: "linear-gradient(to top, var(--paper) 75%, transparent)" }}
          >
            {next ? (
              <Button
                size="lg"
                block
                onClick={() => go(`/lesson/${next.id}`)}
                pending={going && goingTo !== "/"}
                disabled={going && goingTo === "/"}
              >
                Prossima fermata: {next.city} <IconArrowRight size={20} />
              </Button>
            ) : null}
            <Button
              size="md"
              variant={next ? "ghost" : "primary"}
              block
              onClick={() => go("/")}
              pending={going && goingTo === "/"}
              disabled={going && goingTo !== "/"}
            >
              Back to the journey
            </Button>
          </motion.div>
        </motion.main>
      )}
      {stage !== "run" && <LessonPlan open={planOpen} title={planTitle} rows={planRows} onClose={closePlan} />}
    </>
  );
}
