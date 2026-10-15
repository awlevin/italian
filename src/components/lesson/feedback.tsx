"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { Phase, Verdict } from "@/components/exercises/types";
import { Button } from "@/components/ui/button";
import { IconCheck, IconX } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";

const PRAISE = ["Esatto!", "Perfetto!", "Giusto!", "Bravo!", "Ottimo!", "Benissimo!", "Proprio così!"];
const OOPS = ["Quasi!", "Non proprio…", "Peccato!", "Ci sei quasi!"];

/**
 * The bottom action area. Idle: a single primary action.
 * After answering: a tinted sheet slides up with the verdict, the why, and Continue.
 */
export function Footer({
  phase,
  verdict,
  explain,
  primary,
  seed,
  onSheetHeight,
}: {
  /** Reports the verdict sheet's height so the page can keep content clear of it. */
  onSheetHeight?: (h: number) => void;
  /** Varies the praise word between answers, deterministically. */
  seed: number;
  phase: Phase;
  verdict: Verdict | null;
  explain?: string;
  primary: { label: string; onClick: () => void; disabled?: boolean } | null;
}) {
  const answered = phase !== "answering";
  const ok = phase === "correct";
  const words = ok ? PRAISE : OOPS;
  const word = words[(seed * 7 + 3) % words.length];
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheet.current;
    if (!answered || !el || !onSheetHeight) return;
    const ro = new ResizeObserver(() => onSheetHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [answered, onSheetHeight]);

  return (
    <div className="relative z-20">
      <AnimatePresence>
        {answered && (
          <motion.div
            key="sheet"
            ref={sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className={`absolute inset-x-0 bottom-0 rounded-t-[28px] ${ok ? "bg-olive-soft" : "bg-wrong-soft"}`}
          >
            <div className="mx-auto max-w-xl px-5 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.08 }}
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${ok ? "bg-olive" : "bg-wrong"} text-card`}
                >
                  {ok ? <IconCheck size={20} strokeWidth={3} /> : <IconX size={20} strokeWidth={3} />}
                </motion.span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`font-display text-[24px] leading-tight ${ok ? "text-olive" : "text-wrong"}`}>{word}</p>
                  {!ok && verdict?.answer && (
                    <p className="text-[16px] text-ink">
                      <span className="text-ink-2">Answer: </span>
                      <span className="font-semibold" lang="it">{verdict.answer}</span>
                    </p>
                  )}
                  {verdict?.note && (
                    <p className="text-[15px] text-ink">
                      <Rich text={verdict.note} />
                    </p>
                  )}
                  {explain && (
                    <p className="text-[15px] leading-snug text-ink-2">
                      <Rich text={explain} />
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto max-w-xl px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait" initial={false}>
          {primary && (
            <motion.div
              key={primary.label + phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <Button
                size="lg"
                block
                variant={phase === "correct" ? "olive" : phase === "wrong" ? "wrong" : "primary"}
                onClick={primary.onClick}
                disabled={primary.disabled}
              >
                {primary.label}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
