"use client";

import { AnimatePresence, motion } from "motion/react";
import { Rich } from "@/components/ui/rich";

/** Small caps eyebrow + prompt line shared by every exercise. */
export function Prompt({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">{eyebrow}</p>
      <h2 className="text-[19px] leading-snug font-medium text-ink-2 text-balance">
        <Rich text={text} />
      </h2>
    </div>
  );
}

/**
 * An Italian sentence with an optional ___ blank, set large in the display face.
 * Once answered the blank always shows the right word; a wrong attempt stays struck beside it.
 */
export function Sentence({
  text,
  fill,
  state = "empty",
  struck,
}: {
  text: string;
  fill?: string;
  state?: "correct" | "wrong" | "empty";
  /** The learner's wrong attempt, shown crossed out before the right word. */
  struck?: string;
}) {
  const [before, after] = text.split("___");
  const hasBlank = after !== undefined;
  const answered = state !== "empty";
  return (
    <p lang="it" className="font-display text-[28px] leading-[1.25] tracking-[-0.01em] text-ink text-balance">
      <Rich text={before} speakable={false} />
      {hasBlank && (
        <>
          <span
            className={`mx-1 inline-flex min-w-[3.2ch] items-baseline justify-center gap-1.5 border-b-[3px] px-1 transition-colors duration-300 ${
              answered ? "border-ok" : "border-ink-3/60"
            }`}
          >
            {answered && struck && (
              <motion.s
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[0.7em] text-wrong decoration-wrong/70 decoration-2"
              >
                {struck}
              </motion.s>
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={answered ? `a:${fill}` : "live"}
                initial={answered ? { opacity: 0, y: -10, scale: 0.85 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ type: "spring", stiffness: 520, damping: 24, delay: struck ? 0.12 : 0 }}
                className={`inline-block ${answered ? "text-ok" : "text-ink-3"}`}
              >
                {fill ?? " "}
              </motion.span>
            </AnimatePresence>
          </span>
          <Rich text={after} speakable={false} />
        </>
      )}
    </p>
  );
}
