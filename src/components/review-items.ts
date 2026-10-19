"use client";

import { useMemo } from "react";
import { itemById } from "@/content/course";
import type { AddedPhrase } from "@/lib/added-phrases";
import { cardId, practisable } from "@/lib/phrase-cards";
import { dueItemIds } from "@/lib/stats";
import { useAddedPhrases } from "./added-phrases";
import { useProgress } from "./progress/provider";

/**
 * What counts as a review item: a course exercise, or an entry added to the
 * phrasebook that is ready. States left by deleted entries are ignored.
 */
export function useReviewItems() {
  const { phrases } = useAddedPhrases();
  return useMemo(() => {
    const added = practisable(phrases);
    const addedByCard = new Map<string, AddedPhrase>(added.map((p) => [cardId(p), p]));
    const has = (id: string) => itemById.has(id) || addedByCard.has(id);
    return { added, addedByCard, has };
  }, [phrases]);
}

/** Cards due now, for the home nudge and the Review tab's badge. */
export function useDueCount() {
  const progress = useProgress();
  const { has } = useReviewItems();
  return dueItemIds(progress).filter(has).length;
}
