"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { course } from "@/content/course";
import { learnedCount, streak } from "@/lib/stats";
import { useProgress, useProgressReady } from "./progress/provider";
import { Button } from "./ui/button";
import { IconArrowRight, IconCheck } from "./ui/icons";
import { SplitFlap } from "./ui/split-flap";

export function Journey() {
  const progress = useProgress();
  const ready = useProgressReady();
  const currentIdx = Math.max(
    0,
    course.findIndex((l) => !progress.lessons[l.id]?.completedAt),
  );
  const allDone = course.every((l) => progress.lessons[l.id]?.completedAt);
  const current = course[allDone ? course.length - 1 : currentIdx];
  const cur = progress.lessons[current.id];
  const inProgress = cur && !cur.completedAt && cur.stepIndex > 0;
  const days = streak(progress.days);
  const learned = learnedCount(progress);

  return (
    <div className="space-y-8 pt-3">
      {/* Departure board */}
      <section className="space-y-3">
        <div className="rounded-[22px] bg-[#14100c] p-4 text-[#f6efe3] shadow-lift">
          <div className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.2em] text-[#f6efe3]/55">
            <span>{allDone ? "CAPOLINEA · LAST STOP" : "PROSSIMA FERMATA · NEXT STOP"}</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-[#f2c94c]" />
              {String(currentIdx + 1).padStart(2, "0")}/{course.length}
            </span>
          </div>
          {ready ? <SplitFlap key={current.id} text={current.city} /> : <div className="h-[30px]" />}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[20px] leading-tight italic">{current.title}</p>
              <p className="text-[14px] text-[#f6efe3]/65">{current.subtitle}</p>
            </div>
          </div>
        </div>
        <Link href={`/lesson/${current.id}`} className="block">
          <Button size="lg" block tabIndex={-1}>
            {inProgress ? `Riprendi · card ${cur.stepIndex + 1}` : allDone ? "Ride it again" : currentIdx === 0 && !cur ? "Partenza!" : "Next stop"}
            <IconArrowRight size={20} />
          </Button>
        </Link>
      </section>

      {/* Quiet stats */}
      {(days > 0 || learned > 0) && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-2.5"
        >
          <Stat value={days} label={days === 1 ? "giorno di fila" : "giorni di fila"} sub="day streak" />
          <Stat value={learned} label="parole sicure" sub="solid answers" />
        </motion.section>
      )}

      {/* The line */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] font-bold tracking-[0.18em] text-ink-3 uppercase">Il viaggio</h2>
        <ol className="relative">
          {course.map((l, i) => {
            const p = progress.lessons[l.id];
            const done = !!p?.completedAt;
            const isCurrent = !allDone && i === currentIdx;
            const prevDone = i > 0 && !!progress.lessons[course[i - 1].id]?.completedAt;
            return (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <Link
                  href={`/lesson/${l.id}`}
                  className="group relative flex gap-4 rounded-2xl py-1 pr-2 transition-colors"
                >
                  {/* Track */}
                  <div className="relative flex w-8 shrink-0 flex-col items-center">
                    <span
                      className={`w-[3px] flex-1 ${i === 0 ? "bg-transparent" : prevDone ? "bg-olive" : "bg-line"}`}
                    />
                    <span
                      className={`relative z-10 my-1 grid shrink-0 place-items-center rounded-full transition-transform group-hover:scale-110 ${
                        done
                          ? "size-6 bg-olive text-card"
                          : isCurrent
                            ? "size-6 border-[3px] border-accent bg-card"
                            : "size-4 border-[3px] border-line bg-paper"
                      }`}
                    >
                      {done && <IconCheck size={14} strokeWidth={3.2} />}
                      {isCurrent && (
                        <span className="absolute -inset-1.5 animate-ping rounded-full border-2 border-accent/40" />
                      )}
                    </span>
                    <span
                      className={`w-[3px] flex-1 ${i === course.length - 1 ? "bg-transparent" : done ? "bg-olive" : "bg-line"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className={`font-display text-[21px] leading-tight tracking-[-0.01em] ${
                          isCurrent ? "text-ink" : done ? "text-ink" : "text-ink-2"
                        }`}
                      >
                        {l.city}
                      </p>
                      {done && p.bestAccuracy != null && (
                        <span className="font-mono text-[11px] font-bold text-olive">{Math.round(p.bestAccuracy * 100)}%</span>
                      )}
                      {!done && p && p.stepIndex > 0 && (
                        <span className="font-mono text-[11px] font-bold text-accent">
                          {p.stepIndex}/{l.steps.length}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[14px] text-ink-3">
                      <span className="italic">{l.title}</span> · {l.subtitle}
                    </p>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="font-display text-[28px] leading-none">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-ink-2">{label}</p>
      <p className="text-[12px] text-ink-3">{sub}</p>
    </div>
  );
}
