"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { createContext, use, useEffect, useState } from "react";
import { itemById, lines, type LineId } from "@/content/course";
import type { Lesson } from "@/content/types";
import { dueItemIds, learnedCount, streak } from "@/lib/stats";
import { AppVersion } from "./app-version";
import { OfflineCard } from "./offline-card";
import { useProgress, useProgressReady } from "./progress/provider";
import { ButtonLink } from "./ui/button";
import { IconArrowRight, IconCheck, IconRepeat, IconTrain } from "./ui/icons";
import { Segmented } from "./ui/segmented";
import { SplitFlap } from "./ui/split-flap";
import { setUiLang, useT, useUiLang, type UiLang } from "@/lib/locale";

const MotionLink = motion.create(Link);

// "ponte" is the app's old name; the key stays so saved choices survive.
const LINE_KEY = "ponte:line";

function readLine(): LineId {
  try {
    const v = localStorage.getItem(LINE_KEY);
    return v === "viaggio" ? "viaggio" : "corso";
  } catch {
    return "corso";
  }
}

/**
 * True on the first visit to this screen in a session. The board, stops and
 * rail animate in once; coming back from another tab shows them settled.
 */
const Intro = createContext(true);
let introShown = false;

export function Journey() {
  const [intro] = useState(() => !introShown);
  useEffect(() => {
    introShown = true;
  }, []);
  const t = useT();
  const [lineId, setLineId] = useState<LineId>(readLine);
  const choose = (id: LineId) => {
    setLineId(id);
    try {
      localStorage.setItem(LINE_KEY, id);
    } catch {}
  };
  const line = lines.find((l) => l.id === lineId)!;

  return (
    <div className="space-y-5 pt-2">
      <Segmented
        label="Line"
        value={lineId}
        onChange={choose}
        options={lines.map((l) => ({ value: l.id, label: t(l.short, l.it) }))}
      />
      <Intro value={intro}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={line.id}
            initial={{ opacity: 0, x: line.id === "viaggio" ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: line.id === "viaggio" ? -24 : 24, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <LineView lessons={line.lessons} />
          </motion.div>
        </AnimatePresence>
      </Intro>
      <OfflineCard />
      <LanguageSetting />
      <AppVersion />
    </div>
  );
}

function LineView({ lessons: course }: { lessons: Lesson[] }) {
  const intro = use(Intro);
  const progress = useProgress();
  const ready = useProgressReady();
  const currentIdx = Math.max(
    0,
    course.findIndex((l) => !progress.lessons[l.id]?.completedAt),
  );
  const allDone = course.every((l) => progress.lessons[l.id]?.completedAt);
  const current = course[allDone ? course.length - 1 : currentIdx];
  const cur = progress.lessons[current.id];
  const inProgress = !!cur && !cur.completedAt && cur.stepIndex > 0;
  const days = streak(progress.days);
  const learned = learnedCount(progress);
  const due = dueItemIds(progress).filter((id) => itemById.has(id)).length;
  const t = useT();

  const cta = allDone
    ? { href: "/review", label: t("Review everything", "Ripassa tutto") }
    : inProgress
      ? { href: `/lesson/${current.id}`, label: t(`Resume ${current.city}`, `Riprendi ${current.city}`) }
      : currentIdx === 0
        ? { href: `/lesson/${current.id}`, label: t("Start", "Partenza!") }
        : { href: `/lesson/${current.id}`, label: t(`Go to ${current.city}`, `Parti per ${current.city}`) };

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <Board
          lesson={current}
          index={allDone ? course.length - 1 : currentIdx}
          total={course.length}
          allDone={allDone}
          ready={ready}
          step={inProgress ? cur.stepIndex : null}
        />
        <ButtonLink href={cta.href} size="lg" block>
          {cta.label}
          <IconArrowRight size={20} />
        </ButtonLink>
      </section>

      {ready && due > 0 && (
        <motion.div
          initial={intro ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ReviewNudge due={due} />
        </motion.div>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">{t("Stops", "Le fermate")}</h2>
          {ready && (days > 0 || learned > 0) && (
            <motion.p initial={intro ? { opacity: 0 } : false} animate={{ opacity: 1 }} className="flex gap-3 text-[13px] text-ink-3">
              {days > 0 && <Stat value={days} label={days === 1 ? t("day streak", "giorno di fila") : t("day streak", "giorni di fila")} title="Day streak" />}
              {learned > 0 && (
                <Stat value={learned} label={learned === 1 ? t("solid word", "parola sicura") : t("solid words", "parole sicure")} title="Answers right twice in a row" />
              )}
            </motion.p>
          )}
        </div>
        <ol>
          {course.map((l, i) => (
            <Station
              key={l.id}
              lesson={l}
              index={i}
              last={i === course.length - 1}
              state={progress.lessons[l.id]?.completedAt ? "done" : !allDone && i === currentIdx ? "current" : "ahead"}
              prevDone={i > 0 && !!progress.lessons[course[i - 1].id]?.completedAt}
              step={progress.lessons[l.id]?.stepIndex ?? 0}
              accuracy={progress.lessons[l.id]?.bestAccuracy ?? null}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

function Board({
  lesson,
  index,
  total,
  allDone,
  ready,
  step,
}: {
  lesson: Lesson;
  index: number;
  total: number;
  allDone: boolean;
  ready: boolean;
  step: number | null;
}) {
  const intro = use(Intro);
  const pct = step != null ? Math.min(1, step / lesson.steps.length) : 0;
  return (
    <div
      className="relative overflow-hidden rounded-[22px] bg-board p-4 shadow-lift ring-1 ring-black/5 dark:ring-white/10"
      style={{ color: "var(--board-ink)" }}
    >
      {/* A faint top sheen so the board reads as a lit panel, not a hole. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.2em] opacity-55">
        <span>{allDone ? "CAPOLINEA · LAST STOP" : "PROSSIMA FERMATA · NEXT STOP"}</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-board-signal" />
          {String(index + 1).padStart(2, "0")}/{total}
        </span>
      </div>
      <div className="h-[30px]">{ready && <SplitFlap key={lesson.id} text={lesson.city} instant={!intro} />}</div>
      <div className="mt-4 min-w-0">
        <p className="font-display text-[20px] leading-tight italic">{lesson.title}</p>
        <p className="text-[14px] opacity-65">{lesson.subtitle}</p>
      </div>
      {step != null && (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12">
            <motion.div
              className="h-full rounded-full bg-board-signal"
              initial={intro ? { width: 0 } : false}
              animate={{ width: `${pct * 100}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20, delay: 0.5 }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold tabular-nums opacity-70">
            {step}/{lesson.steps.length}
          </span>
        </div>
      )}
    </div>
  );
}

function ReviewNudge({ due }: { due: number }) {
  const t = useT();
  return (
    <MotionLink
      href="/review"
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3.5 rounded-2xl border border-line bg-card p-3 pr-4 shadow-card transition-colors hover:border-ink-3/40"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <IconRepeat size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">
          {due} {due === 1 ? t("card to review", "carta da ripassare") : t("cards to review", "carte da ripassare")}
        </span>
        <span className="block text-[13px] text-ink-3">A quick refresh before they fade</span>
      </span>
      <IconArrowRight size={18} className="shrink-0 text-ink-3" />
    </MotionLink>
  );
}

function Stat({ value, label, title }: { value: number; label: string; title: string }) {
  return (
    <span title={title}>
      <span className="font-display text-[16px] text-ink tabular-nums">{value}</span> {label}
    </span>
  );
}

const RAIL = "absolute left-4 w-[3px] -translate-x-1/2 overflow-hidden bg-line";

function Station({
  lesson: l,
  index: i,
  last,
  state,
  prevDone,
  step,
  accuracy,
}: {
  lesson: Lesson;
  index: number;
  last: boolean;
  state: "done" | "current" | "ahead";
  prevDone: boolean;
  step: number;
  accuracy: number | null;
}) {
  const intro = use(Intro);
  const first = i === 0;
  const fill = (on: boolean, delay: number) =>
    on && (
      <motion.span
        className="absolute inset-0 origin-top bg-ok"
        initial={intro ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.22, delay, ease: "linear" }}
      />
    );

  return (
    <motion.li
      initial={intro ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.025 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* The track: two half-segments per stop, so the line is continuous across rows. */}
      {!first && <span aria-hidden className={`${RAIL} top-0 h-1/2`}>{fill(prevDone, 0.2 + i * 0.12)}</span>}
      {!last && <span aria-hidden className={`${RAIL} top-1/2 bottom-0`}>{fill(state === "done", 0.26 + i * 0.12)}</span>}

      <span aria-hidden className="absolute top-1/2 left-4 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
        {state === "done" ? (
          <span className="grid size-6 place-items-center rounded-full bg-ok text-card ring-4 ring-paper">
            <IconCheck size={14} strokeWidth={3.2} />
          </span>
        ) : state === "current" ? (
          <span className="relative grid size-8 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_2px_0_var(--accent-press)] ring-4 ring-paper">
            <motion.span
              className="absolute inset-0 rounded-full bg-accent"
              initial={{ opacity: 0.4, scale: 1 }}
              animate={{ opacity: 0, scale: 1.75 }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
            />
            <IconTrain size={16} className="relative" />
          </span>
        ) : (
          <span className="size-3.5 rounded-full border-[3px] border-line bg-paper ring-4 ring-paper" />
        )}
      </span>

      <MotionLink
        href={`/lesson/${l.id}`}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 600, damping: 32 }}
        className="group relative block py-1 pl-11"
      >
        <span className="block rounded-xl px-2.5 py-2.5 transition-colors group-hover:bg-card group-active:bg-paper-2">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={`font-display text-[21px] leading-tight tracking-[-0.01em] ${state === "ahead" ? "text-ink-2" : "text-ink"}`}
            >
              {l.city}
            </span>
            {state === "done" && accuracy != null && (
              <span className="font-mono text-[11px] font-bold text-ok tabular-nums">{Math.round(accuracy * 100)}%</span>
            )}
            {state !== "done" && step > 0 && (
              <span className="font-mono text-[11px] font-bold text-accent tabular-nums">
                {step}/{l.steps.length}
              </span>
            )}
          </span>
          <span className="block truncate text-[14px] text-ink-3">
            <span className="italic">{l.title}</span>
            <span className="px-1.5 opacity-60">·</span>
            {l.subtitle}
          </span>
        </span>
      </MotionLink>
    </motion.li>
  );
}

/** The language of menus and buttons. Lessons are always Italian. */
function LanguageSetting() {
  const lang = useUiLang();
  const t = useT();
  return (
    <section aria-label="App language" className="space-y-2">
      <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">
        {t("Menu language", "Lingua dei menu")}
      </h2>
      <Segmented<UiLang>
        label="App language"
        value={lang}
        onChange={setUiLang}
        options={[
          { value: "en", label: "English" },
          { value: "it", label: "Italiano" },
        ]}
      />
    </section>
  );
}
