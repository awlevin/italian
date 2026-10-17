import { z } from "zod";
import type { Phrase } from "@/content/types";

/** Phrasebook group id for phrases added from search. */
export const ADDED_GROUP = "aggiunte";

export type AddedStatus = "translating" | "recording" | "ready" | "failed";

/** A phrase added from search, as the API sends it. Ready ones carry it, en and say. */
export interface AddedPhrase extends Phrase {
  query: string;
  status: AddedStatus;
  audioUrl: string | null;
  error: string | null;
  createdAt: string;
}

export const addPhraseSchema = z.object({ query: z.string().trim().min(2).max(140) });

/** A request still working after this long has died with its function; asking again restarts it. */
export const STALE_MS = 90_000;

export const isPending = (p: Pick<AddedPhrase, "status">) => p.status === "translating" || p.status === "recording";
