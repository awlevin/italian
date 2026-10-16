"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { allItems, allLessons, itemById, lines } from "@/content/course";
import { shuffle } from "@/lib/diff";
import { dueItemIds } from "@/lib/stats";
import { Session, type SessionItem, type SessionResult } from "./lesson/session";
import { useDispatch, useProgress, useProgressReady } from "./progress/provider";
import { Button, ButtonLink } from "./ui/button";
import { IconArrowRight, IconCheck, IconRepeat, IconTrain } from "./ui/icons";
import { useT } from "@/lib/locale";

const SESSION_SIZE = 12;
const EASE = [0.22, 1, 0.36, 1] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "in 40 min", "in 3 h", "tomorrow", "in 4 days". */
function fromNow(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

export function Review({ shell }: { shell: (children: React.ReactNode) => React.ReactNode }) {
  const progress = useProgress();
  const ready = useProgressReady();
  const dispatch = useDispatch();
  const t = useT();
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  // A running session owns a history entry (?s=1): the session's Leave link
  // (to /review) and the phone's back gesture both end it.
  const inSession = useSearchParams().has("s");
  useEffect(() => {
    if (inSession && !session) window.history.replaceState(null, "", "/review");
  }, [inSession, session]);

  const due = useMemo(() => dueItemIds(progress).filter((id) => itemById.has(id)), [progress]);
  const seen = Object.keys(progress.items).filter((id) => itemById.has(id));
  const completedLessons = allLessons.filter((l) => progress.lessons[l.id]?.completedAt);
  const [now] = useState(() => Date.now());
  const nextDue = useMemo(() => {
    const times = Object.entries(progress.items)
      .filter(([id]) => itemById.has(id))
      .map(([, v]) => Date.parse(v.dueAt))
      .filter((t) => t > now);
    return times.length ? Math.min(...times) : null;
  }, [progress.items, now]);

  const start = (ids: string[]) => {
    setResult(null);
    window.history.pushState(null, "", "/review?s=1");
    setSession(
      ids.slice(0, SESSION_SIZE).map((id) => {
        const it = itemById.get(id)!;
        return { key: id, step: it.step, label: `${it.lesson.city} · ${it.lesson.title}` };
      }),
    );
  };

  const practiceAll = () => {
    // Weakest first, then a shuffle of the rest of what they've seen.
    const weak = [...seen].sort((a, b) => (progress.items[a]?.box ?? 0) - (progress.items[b]?.box ?? 0)).slice(0, 6);
    const rest = shuffle(seen.filter((id) => !weak.includes(id)));
    start([...weak, ...rest]);
  };

  const onAnswer = useCallback(
    (item: SessionItem, correct: boolean) => dispatch({ t: "answer", itemId: item.key, correct }),
    [dispatch],
  );
  const onFinish = useCallback((r: SessionResult) => {
    setResult(r);
    setSession(null);
    window.history.replaceState(null, "", "/review");
    window.scrollTo({ top: 0 });
  }, []);

  if (session && inSession) {
    return <Session items={session} exitHref="/review" onAnswer={onAnswer} onFinish={onFinish} />;
  }

  const batch = Math.min(due.length, SESSION_SIZE);

  return shell(
    <div className="space-y-6 pt-2">
      <div className="space-y-1.5">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">{t("Review", "Ripasso")}</h1>
        <p className="text-[16px] leading-relaxed text-ink-2">Missed cards come back sooner, solid ones later. A few minutes a day keeps it all fresh.</p>
      </div>

      <AnimatePresence initial={false}>
        {result && result.exercises > 0 && <ResultCard key="result" result={result} />}
      </AnimatePresence>

      <motion.div layout="position" className="rounded-[22px] border border-line bg-card p-5 shadow-card">
        {!ready ? (
          <div className="h-[132px] animate-pulse rounded-2xl bg-paper-2/60" />
        ) : due.length > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <IconRepeat size={26} />
              </div>
              <div>
                <p className="font-display text-[34px] leading-none tabular-nums">{due.length}</p>
                <p className="mt-1 text-[14px] text-ink-2">
                  {due.length === 1 ? "card due now" : "cards due now"}
                  <span className="text-ink-3"> · about {Math.max(1, Math.round((batch * 10) / 60))} min</span>
                </p>
              </div>
            </div>
            <Button size="lg" block className="mt-5" onClick={() => start(due)}>
              Review {plural(batch, "card", "cards")} <IconArrowRight size={20} />
            </Button>
          </>
        ) : seen.length > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok">
                <IconCheck size={28} strokeWidth={2.6} />
              </div>
              <div>
                <p className="font-display text-[26px] leading-tight">{t("All caught up", "Tutto in ordine")}</p>
                <p className="text-[14px] text-ink-2">
                  {t("Nothing due.", "All caught up.")}{nextDue && <span className="text-ink-3"> Next card due {fromNow(nextDue - now)}.</span>}
                </p>
              </div>
            </div>
            <Button size="lg" variant="secondary" block className="mt-5" onClick={practiceAll}>
              Practice weakest cards anyway
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper-2 text-ink-3">
                <IconTrain size={26} />
              </div>
              <div>
                <p className="font-display text-[26px] leading-tight">{t("Nothing yet", "Niente ancora")}</p>
                <p className="text-[14px] text-ink-2">Finish a stop and its cards show up here.</p>
              </div>
            </div>
            <ButtonLink href="/" size="lg" block className="mt-5">
              Go to the journey <IconArrowRight size={20} />
            </ButtonLink>
          </>
        )}
      </motion.div>

      {completedLessons.length > 0 && (
        <motion.section layout="position" className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Practice one stop</h2>
          {lines.map((line) => {
            const done = line.lessons.filter((l) => completedLessons.includes(l));
            if (!done.length) return null;
            return (
              <div key={line.id} className="space-y-2">
                <p className="text-[13px] text-ink-3 italic">{line.it}</p>
                <div className="flex flex-wrap gap-2">
                  {done.map((l) => (
                    <motion.button
                      key={l.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => start(shuffle(allItems.filter((i) => i.lesson.id === l.id).map((i) => i.id)))}
                      className="h-11 rounded-full border border-line bg-card px-4 font-display text-[16px] text-ink-2 transition-colors hover:border-ink-3/50 hover:text-ink"
                    >
                      {l.city}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.section>
      )}
    </div>,
  );
}

function ResultCard({ result }: { result: SessionResult }) {
  const pct = result.firstTryCorrect / result.exercises;
  const r = 22;
  const c = 2 * Math.PI * r;
  const t = useT();
  const verdict =
    pct === 1
      ? t("Perfect!", "Perfetto!")
      : pct >= 0.75
        ? t("Nice work!", "Bravo!")
        : pct >= 0.5
          ? t("Done!", "Fatto!")
          : t("Almost there", "Ci siamo quasi");
  const line =
    pct === 1
      ? "Every card right on the first try."
      : pct >= 0.5
        ? "The misses come back sooner, so they stick."
        : "Tricky set. The misses come back soon for another go.";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex items-center gap-4 rounded-[22px] bg-ok-soft p-4 pr-5"
      role="status"
    >
      <div className="relative grid size-16 shrink-0 place-items-center">
        <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-ok/20" />
          <motion.circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-ok"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          />
        </svg>
        <span className="font-mono text-[13px] font-bold text-ok tabular-nums">
          {result.firstTryCorrect}/{result.exercises}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-display text-[24px] leading-tight text-ink italic">{verdict}</p>
        <p className="text-[14px] leading-snug text-ink-2">{line}</p>
      </div>
    </motion.div>
  );
}
