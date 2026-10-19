"use client";

import { motion } from "motion/react";
import { createContext, use } from "react";
import type { AddedPhrase } from "@/lib/added-phrases";
import { IconBook, IconSpeaker } from "@/components/ui/icons";
import { speak } from "@/lib/audio";
import { useT } from "@/lib/locale";

/**
 * The learner's phrasebook entries that use the rule a lesson card teaches,
 * by the card's step id. Provided by the lesson player only, so review
 * sessions never show them.
 */
export const YourPhrasesContext = createContext<Map<string, AddedPhrase[]> | null>(null);

/** Under a teach or morph card: "you've already met this", with up to three of their own entries. */
export function YourPhrases({ stepId }: { stepId: string }) {
  const entries = use(YourPhrasesContext)?.get(stepId);
  const t = useT();
  if (!entries?.length) return null;
  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      aria-labelledby={`yours-${stepId}`}
      className="mt-5 rounded-2xl border border-line bg-card/60 px-4 pt-3 pb-1"
    >
      <p id={`yours-${stepId}`} className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.16em] text-bridge uppercase">
        <IconBook size={14} /> {t("From your phrasebook", "Dal tuo frasario")}
      </p>
      <ul className="divide-y divide-line/70">
        {entries.slice(0, 3).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => speak(p.it)}
              className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left active:text-accent"
            >
              <IconSpeaker size={16} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 leading-snug">
                <span lang="it" className="block text-[16px] font-semibold text-ink">
                  {p.it}
                </span>
                <span className="block text-[13.5px] text-ink-2">{p.en}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.aside>
  );
}
