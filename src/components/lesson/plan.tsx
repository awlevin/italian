"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Step } from "@/content/types";
import { Paragraphs, Tip } from "@/components/exercises/teach";
import { Button } from "@/components/ui/button";
import { IconArrowRight, IconChevronDown, IconX } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";

export type PlanState = "done" | "current" | "todo";

export interface PlanRow {
  step: Step;
  state: PlanState;
  /** Context chip, e.g. the lesson in review mode. */
  label?: string;
  /** What tapping through does: jump to the card, start from it… */
  action?: { label: string; onClick: () => void };
}

const KIND: Record<Step["kind"], string> = {
  teach: "New",
  morph: "Sound rule",
  choice: "Choose",
  listen: "Listen",
  type: "Type",
  build: "Build",
  match: "Match",
};

function headline(step: Step) {
  switch (step.kind) {
    case "teach":
    case "morph":
      return step.title;
    case "match":
      return step.prompt ?? "Match the pairs";
    default:
      return step.prompt;
  }
}

function Answer({ label = "Answer", text }: { label?: string; text: string }) {
  return (
    <p className="text-[15px] text-ink">
      <span className="text-ink-2">{label}: </span>
      <span className="font-semibold" lang="it">
        <Rich text={text} speakable={false} />
      </span>
    </p>
  );
}

function Explain({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="rounded-2xl bg-paper-2 px-4 py-3 text-[15px] leading-snug text-ink-2">
      <Rich text={text} />
    </p>
  );
}

/** The gist of a card, readable without playing it. Answers stay hidden until the card is done. */
function Details({ step, reveal }: { step: Step; reveal: boolean }) {
  switch (step.kind) {
    case "teach":
      return (
        <>
          <Paragraphs text={step.body} className="text-[15.5px] leading-relaxed text-ink-2 text-pretty" />
          {step.tip && <Tip text={step.tip} />}
          {step.examples && step.examples.length > 0 && (
            <ul className="space-y-1 text-[15px]">
              {step.examples.map((ex, i) => (
                <li key={i}>
                  <span className="font-semibold text-ink" lang="it">
                    {ex.it}
                  </span>{" "}
                  <span className="text-ink-2">· {ex.en}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      );
    case "morph":
      return (
        <>
          <p className="text-[15.5px] leading-relaxed text-ink-2">
            <Rich text={step.rule} />
          </p>
          <ul className="space-y-1 text-[15px]">
            {step.pairs.map((p) => (
              <li key={p.it}>
                <span className="text-bridge italic" lang="es">
                  {p.es}
                </span>{" "}
                <span className="text-ink-3">→</span>{" "}
                <span className="font-semibold text-ink" lang="it">
                  {p.it}
                </span>{" "}
                <span className="text-ink-2">· {p.en}</span>
              </li>
            ))}
          </ul>
        </>
      );
  }
  if (!reveal)
    return <p className="text-[14px] text-ink-3">The answer and the explanation show up here once you&apos;ve done this card.</p>;
  switch (step.kind) {
    case "choice":
      return (
        <>
          {step.it && (
            <p className="font-display text-[19px] text-ink" lang="it">
              {step.it.replace("___", "…")}
            </p>
          )}
          <Answer text={step.options[step.answer]} />
          <Explain text={step.explain} />
        </>
      );
    case "listen":
      return (
        <>
          <Answer label="You heard" text={step.text} />
          <Answer text={step.options[step.answer]} />
          <Explain text={step.explain} />
        </>
      );
    case "type":
      return (
        <>
          {step.it && (
            <p className="font-display text-[19px] text-ink" lang="it">
              {step.it.replace("___", "…")}
            </p>
          )}
          <Answer text={step.answers[0]} />
          <Explain text={step.explain} />
        </>
      );
    case "build":
      return (
        <>
          <Answer text={step.answer} />
          <Explain text={step.explain} />
        </>
      );
    case "match":
      return (
        <ul className="space-y-1 text-[15px]">
          {step.pairs.map((p) => (
            <li key={p.it}>
              <span className="font-semibold text-ink" lang="it">
                {p.it}
              </span>{" "}
              <span className="text-ink-2">· {p.en}</span>
            </li>
          ))}
        </ul>
      );
  }
}

/** Mounted with the sheet, so every opening starts with all cards folded. */
function Rows({ rows }: { rows: PlanRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const current = rows.findIndex((r) => r.state === "current");
  return (
        <ol className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {rows.map((r, i) => {
            const isOpen = expanded === i;
            return (
              <li key={i} data-plan-current={i === current || undefined} className="border-t border-line/70 first:border-t-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-paper-2/60 ${
                    r.state === "current" ? "bg-paper-2" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold ${
                      r.state === "done"
                        ? "bg-ok-soft text-ok"
                        : r.state === "current"
                          ? "bg-accent text-accent-ink"
                          : "border border-line text-ink-3"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10.5px] font-bold tracking-[0.14em] text-ink-3 uppercase">
                      {KIND[r.step.kind]}
                      {r.label ? ` · ${r.label}` : ""}
                      {r.state === "current" ? " · You are here" : ""}
                    </span>
                    <span className={`block leading-snug ${r.state === "todo" ? "text-ink-2" : "text-ink"}`}>
                      <Rich text={headline(r.step)} speakable={false} />
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-ink-3"
                  >
                    <IconChevronDown size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1 pr-2 pb-4 pl-12">
                        <Details step={r.step} reveal={r.state === "done"} />
                        {r.action && (
                          <Button size="md" variant="secondary" onClick={r.action.onClick}>
                            {r.action.label} <IconArrowRight size={18} />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
  );
}

/**
 * Every card of a lesson as a list. Tap a card to read its gist;
 * done cards also show the answer and the why from the verdict sheet.
 */
export function LessonPlan({
  open,
  title,
  rows,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: PlanRow[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Open at the card you're on, not at the top of a long lesson.
    const id = requestAnimationFrame(() =>
      document.querySelector("[data-plan-current]")?.scrollIntoView({ block: "center" }),
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-paper/70 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal
            aria-label={`Lesson plan: ${title}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-xl flex-col rounded-t-[28px] border border-b-0 border-line bg-card shadow-lift"
          >
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-ink-3 uppercase">Lesson plan</p>
                <p className="truncate font-display text-[22px] leading-tight text-ink">{title}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close lesson plan"
                className="-mr-2 grid size-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <IconX size={22} />
              </button>
            </div>
            <Rows rows={rows} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
