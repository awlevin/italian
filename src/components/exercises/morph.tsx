"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { MorphStep } from "@/content/types";
import { IconCheck, IconRepeat } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { speak } from "@/lib/audio";
import { charDiff } from "@/lib/diff";

const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/**
 * "es": the Spanish word. "mark": letters about to go are struck, accents to change are flagged.
 * "it": struck letters drop out, Italian letters drop in (in Aperol), accents swap in place.
 */
export type MorphPhase = "es" | "mark" | "it";

/** One word, morphing letter by letter from Spanish into Italian. */
export function MorphWord({
  es,
  it,
  phase,
  className = "text-[28px]",
}: {
  es: string;
  it: string;
  phase: MorphPhase;
  className?: string;
}) {
  const tokens = useMemo(() => charDiff(es, it), [es, it]);
  const spanish = phase !== "it";
  const visible = tokens.filter((t) => t.type === "keep" || (spanish ? t.type === "del" : t.type === "ins"));

  return (
    <span
      className={`inline-flex font-display leading-none tracking-[-0.01em] whitespace-pre transition-colors duration-500 ${className} ${
        spanish ? "text-bridge italic" : "text-ink"
      }`}
      lang={spanish ? "es" : "it"}
      aria-label={spanish ? es : it}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((t) => {
          const accent = t.type === "keep" && !!t.src && t.src !== t.ch;
          const char = spanish && t.src ? t.src : t.ch;
          const marked = phase === "mark" && (t.type === "del" || accent);
          return (
            <motion.span
              key={t.key}
              layout="position"
              initial={{ opacity: 0, y: -14, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.6, filter: "blur(2px)" }}
              transition={spring}
              className={`relative inline-block transition-colors duration-300 ${
                t.type === "ins" ? "text-accent" : marked ? (accent ? "text-ink" : "text-wrong") : ""
              }`}
              aria-hidden
            >
              {accent ? (
                <motion.span
                  key={char}
                  initial={phase === "it" ? { opacity: 0, y: -8, scale: 0.7 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={spring}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ) : (
                char
              )}
              {marked && (
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={`absolute inset-x-0 origin-left rounded-full ${
                    accent ? "-bottom-[0.06em] h-[3px] bg-mark" : "top-[52%] h-[2px] bg-wrong"
                  }`}
                />
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

const MARK_MS = 560;
/** The next row starts while this one is still mid-morph. */
const STAGGER_MS = 360;

function MorphRow({
  pair,
  go,
  onStart,
  onDone,
}: {
  pair: MorphStep["pairs"][number];
  /** The row may start once it is its turn. */
  go: boolean;
  onStart: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { amount: 0.9 });
  const [phase, setPhase] = useState<MorphPhase>("es");
  const [run, setRun] = useState(0);
  const started = useRef(false);

  // First run: wait for our turn and for the row to be on screen.
  const begin = useEffectEvent(() => {
    started.current = true;
    onStart();
    setRun(1);
  });
  useEffect(() => {
    if (go && inView && !started.current) begin();
  }, [go, inView]);

  // Replays speak the Italian as it lands; the first run just reports in.
  const landed = useEffectEvent((n: number) => (n > 1 ? speak(pair.it) : onDone()));
  useEffect(() => {
    if (!run) return;
    const lead = run > 1 ? 280 : 0;
    const steps = [
      setTimeout(() => setPhase("mark"), lead),
      setTimeout(() => {
        setPhase("it");
        landed(run);
      }, lead + MARK_MS),
    ];
    return () => steps.forEach(clearTimeout);
  }, [run]);

  const replay = () => {
    if (!started.current) return;
    setPhase("es");
    setRun((r) => r + 1);
  };

  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={replay}
        aria-label={`${pair.es} becomes ${pair.it}, ${pair.en}. Replay`}
        className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-paper-2 active:bg-paper-2"
      >
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <MorphWord es={pair.es} it={pair.it} phase={phase} />
          <span className="flex items-baseline gap-1.5 text-[13.5px] leading-tight">
            <span className="text-ink-3">{pair.en}</span>
            <motion.span
              initial={false}
              animate={{ opacity: phase === "it" ? 1 : 0, x: phase === "it" ? 0 : -4 }}
              transition={{ delay: phase === "it" ? 0.25 : 0, duration: 0.25 }}
              className="flex items-baseline gap-1.5"
              aria-hidden={phase !== "it"}
            >
              <span className="text-ink-3">·</span>
              <span className="font-display text-bridge italic" lang="es">
                {pair.es}
              </span>
            </motion.span>
          </span>
        </span>
        <IconRepeat
          size={16}
          className="shrink-0 text-ink-3 opacity-30 transition-opacity group-hover:opacity-100 group-active:opacity-100"
        />
      </button>
    </li>
  );
}

export function Morph({ step }: { step: MorphStep }) {
  const [turn, setTurn] = useState(-1);
  const [done, setDone] = useState(0);
  const total = step.pairs.length;

  // Let the card settle in before the first word moves.
  useEffect(() => {
    const id = setTimeout(() => setTurn(0), 650);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-bridge uppercase">Il ponte · sound rule</p>
        <h2 className="font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">
          <Rich text={step.title} speakable={false} />
        </h2>
        <p className="text-[17px] leading-relaxed text-ink-2 text-pretty">
          <Rich text={step.rule} />
        </p>
      </div>
      <ul className="-mx-3 divide-y divide-line/60">
        {step.pairs.map((p, i) => (
          <MorphRow
            key={p.es + p.it}
            pair={p}
            go={i <= turn}
            onStart={() => setTimeout(() => setTurn((t) => Math.max(t, i + 1)), STAGGER_MS)}
            onDone={() => setDone((d) => d + 1)}
          />
        ))}
      </ul>
      <div className="flex min-h-9 flex-col items-center gap-2">
        <AnimatePresence>
          {done >= total && (
            <motion.p
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.25 }}
              className="inline-flex items-center gap-2 rounded-full bg-ok-soft py-1.5 pr-3.5 pl-1.5 text-[14px] font-semibold text-ok"
            >
              <span className="grid size-6 place-items-center rounded-full bg-ok text-card">
                <IconCheck size={14} strokeWidth={3} />
              </span>
              +{total} words you already knew
            </motion.p>
          )}
        </AnimatePresence>
        <p className="text-center text-[13px] text-ink-3">Tap a word to replay it and hear the Italian</p>
      </div>
    </div>
  );
}
