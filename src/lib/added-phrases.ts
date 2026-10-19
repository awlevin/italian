import { z } from "zod";
import type { Phrase } from "@/content/types";

/** Phrasebook group id for sentences added from search. */
export const ADDED_GROUP = "aggiunte";
/** Phrasebook group id for single words added from search. */
export const WORDS_GROUP = "parole";

export type AddedStatus = "translating" | "recording" | "ready" | "failed";

/**
 * What a model learns about an added entry beyond the phrase itself: whether it
 * is a word or a sentence, and what it can teach. Empty strings and arrays
 * stand for "nothing worth saying".
 */
export const detailsSchema = z.object({
  kind: z.enum(["word", "phrase"]).describe("word: one word or a word with its article. phrase: anything longer, or a set expression."),
  pos: z.enum(["noun", "verb", "adjective", "adverb", "other"]).describe("Words only. For a phrase, other."),
  forms: z.array(z.string()).describe("Words only. The forms to learn with it, in order. Empty for phrases."),
  es: z.string().describe("The Spanish equivalent."),
  bridge: z.string().describe("One sentence linking it to the Spanish, or empty."),
  example: z.object({ it: z.string(), en: z.string() }).describe("Words only: a short everyday sentence using it. Empty strings for phrases."),
  parts: z.array(z.object({ it: z.string(), en: z.string() })).describe("Phrases only: the phrase in meaningful chunks, in order. Empty for words."),
  grammar: z.string().describe("Phrases only: one or two sentences on the structure worth noticing, or empty."),
  rule: z.string().describe("The id of the one course card that teaches the rule this entry uses best, or empty."),
});

export type Details = z.infer<typeof detailsSchema>;

/** A phrase added from search, as the API sends it. Ready ones carry it, en and say. */
export interface AddedPhrase extends Phrase {
  query: string;
  status: AddedStatus;
  audioUrl: string | null;
  error: string | null;
  createdAt: string;
  /** Null until described: being written, or added before entries had details. */
  details?: Details | null;
  /** Ready, and its details are being written now: worth asking again shortly. */
  describing?: boolean;
}

export const addPhraseSchema = z.object({ query: z.string().trim().min(2).max(140) });

/** A request still working after this long has died with its function; asking again restarts it. */
export const STALE_MS = 90_000;

export const isPending = (p: Pick<AddedPhrase, "status">) => p.status === "translating" || p.status === "recording";

/** How long a describe may run before another load may try again. */
export const DESCRIBE_LEASE_MS = 60_000;

/**
 * A word or a phrase. The model decides once it has described the entry;
 * until then, one or two short tokens without a question read as a word
 * ("telefono", "la cultura").
 */
export function kindOf(p: Pick<AddedPhrase, "it" | "query" | "status"> & { details?: Details | null }): Details["kind"] {
  if (p.details) return p.details.kind;
  const text = (p.status === "ready" ? p.it : p.query).trim();
  return /[?!]/.test(text) || text.split(/\s+/).length > 2 ? "phrase" : "word";
}
