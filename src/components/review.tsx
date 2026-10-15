"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { allItems, course, itemById } from "@/content/course";
import { shuffle } from "@/lib/diff";
import { dueItemIds } from "@/lib/stats";
import { Session, type SessionItem, type SessionResult } from "./lesson/session";
import { useDispatch, useProgress, useProgressReady } from "./progress/provider";
import { Button } from "./ui/button";
import { IconArrowRight, IconRepeat } from "./ui/icons";

const SESSION_SIZE = 12;

export function Review({ shell }: { shell: (children: React.ReactNode) => React.ReactNode }) {
  const progress = useProgress();
  const ready = useProgressReady();
  const dispatch = useDispatch();
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);

  const due = useMemo(() => dueItemIds(progress).filter((id) => itemById.has(id)), [progress]);
  const seen = Object.keys(progress.items).filter((id) => itemById.has(id));
  const completedLessons = course.filter((l) => progress.lessons[l.id]?.completedAt);

  const start = (ids: string[]) => {
    setResult(null);
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
  }, []);

  if (session) {
    return <Session items={session} exitHref="/review" onAnswer={onAnswer} onFinish={onFinish} />;
  }

  return shell(
    <div className="space-y-6 pt-3">
      <div className="space-y-2">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">Ripasso</h1>
        <p className="text-[16px] leading-relaxed text-ink-2">
          What you missed comes back sooner. What you nailed comes back later. Five minutes here beats an hour of rereading.
        </p>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-olive-soft px-4 py-3 text-[15px] text-ink"
        >
          <span className="font-display text-[19px] text-olive italic">Fatto! </span>
          {result.firstTryCorrect}/{result.exercises} right on the first try.
        </motion.div>
      )}

      <div className="rounded-[22px] border border-line bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <IconRepeat size={26} />
          </div>
          <div>
            <p className="font-display text-[34px] leading-none">{ready ? due.length : "–"}</p>
            <p className="text-[14px] text-ink-2">{due.length === 1 ? "card due now" : "cards due now"}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {due.length > 0 ? (
            <Button size="lg" block onClick={() => start(due)}>
              Review {Math.min(due.length, SESSION_SIZE)} cards <IconArrowRight size={20} />
            </Button>
          ) : seen.length > 0 ? (
            <>
              <p className="pb-1 text-[15px] text-ink-2">All caught up. Want extra practice anyway?</p>
              <Button size="lg" variant="secondary" block onClick={practiceAll}>
                Practice weakest cards
              </Button>
            </>
          ) : (
            <>
              <p className="pb-1 text-[15px] text-ink-2">Nothing to review yet. Finish a stop and its exercises will show up here.</p>
              <Link href="/" className="block">
                <Button size="lg" block tabIndex={-1}>
                  Go to the journey
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {completedLessons.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.18em] text-ink-3 uppercase">Practice one stop</h2>
          <div className="flex flex-wrap gap-2">
            {completedLessons.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => start(shuffle(allItems.filter((i) => i.lesson.id === l.id).map((i) => i.id)))}
                className="rounded-full border border-line bg-card px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors hover:border-ink-3/50 hover:text-ink"
              >
                {l.city}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>,
  );
}
