"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { MorphStep } from "@/content/types";
import { IconRepeat } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { speak } from "@/lib/audio";
import { charDiff } from "@/lib/diff";

const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/** One word, morphing letter by letter from Spanish into Italian. */
export function MorphWord({ es, it, phase }: { es: string; it: string; phase: "es" | "it" }) {
  const tokens = useMemo(() => charDiff(es, it), [es, it]);
  const visible = tokens.filter((t) => t.type === "keep" || (phase === "es" ? t.type === "del" : t.type === "ins"));

  return (
    <span
      className={`inline-flex font-display text-[28px] leading-none tracking-[-0.01em] whitespace-pre transition-colors duration-500 ${
        phase === "es" ? "text-sea italic" : "text-ink"
      }`}
      lang={phase}
      aria-label={phase === "es" ? es : it}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((t) => (
          <motion.span
            key={t.key}
            layout="position"
            initial={{ opacity: 0, y: -14, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.6, filter: "blur(2px)" }}
            transition={spring}
            className={`inline-block ${
              t.type === "ins" ? "text-accent" : t.type === "del" ? "text-sea underline decoration-wrong/60 decoration-2" : ""
            }`}
            aria-hidden
          >
            {t.ch}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

function MorphRow({ pair, delay }: { pair: MorphStep["pairs"][number]; delay: number }) {
  const [phase, setPhase] = useState<"es" | "it">("es");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setPhase("it"), run === 0 ? delay : 650);
    return () => clearTimeout(id);
  }, [delay, run]);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 2500 }}
    >
      <button
        type="button"
        onClick={() => {
          setPhase("es");
          setRun((r) => r + 1);
          setTimeout(() => speak(pair.it), 900);
        }}
        className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-paper-2"
      >
        <span className="w-[42%] shrink-0 truncate font-display text-[17px] text-sea/80 italic" lang="es">
          {pair.es}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <MorphWord es={pair.es} it={pair.it} phase={phase} />
          <span className="text-[13px] text-ink-3">{pair.en}</span>
        </span>
        <IconRepeat size={16} className="shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </motion.li>
  );
}

export function Morph({ step }: { step: MorphStep }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-sea uppercase">Il ponte · sound rule</p>
        <h2 className="font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">{step.title}</h2>
        <p className="text-[17px] leading-relaxed text-ink-2 text-pretty">
          <Rich text={step.rule} />
        </p>
      </div>
      <ul className="-mx-3 divide-y divide-line/60">
        {step.pairs.map((p, i) => (
          <MorphRow key={p.es + p.it} pair={p} delay={900 + i * 420} />
        ))}
      </ul>
      <p className="text-center text-[13px] text-ink-3">Tap a word to replay it and hear the Italian</p>
    </div>
  );
}
