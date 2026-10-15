/**
 * Course content schema.
 *
 * Inline markup supported in every `body`, `prompt`, `explain`, `tip` string:
 *   «parola»   Italian text. Rendered highlighted and tappable (plays audio).
 *   ‹palabra›  Spanish text. Rendered muted, as the "bridge" reference.
 *   ~~sbagliato~~  A WRONG Italian form, shown struck through. Never spoken.
 *   **bold**   Emphasis.
 *   ___        A blank (only inside `it` sentences of exercises).
 */

export interface Example {
  /** Italian. Always speakable. */
  it: string;
  /** English gloss. */
  en: string;
  /** Spanish equivalent, when the comparison teaches something. */
  es?: string;
  /** One short note, e.g. "double t is held longer". */
  note?: string;
}

export interface Table {
  caption?: string;
  head: string[];
  rows: string[][];
}

interface StepBase {
  /** Unique within the lesson. kebab-case. Stable: progress is keyed by it. */
  id: string;
}

/** A short concept card. Keep `body` to 1–3 sentences; put depth in `more`. */
export interface TeachStep extends StepBase {
  kind: "teach";
  title: string;
  body: string;
  examples?: Example[];
  table?: Table;
  /** Spanish-speaker shortcut, rendered as a callout. One sentence. */
  tip?: string;
  /** Progressive disclosure: hidden behind a "More" toggle. */
  more?: { label: string; body: string; table?: Table };
}

/** Animated Spanish → Italian transformation that teaches a sound rule. */
export interface MorphStep extends StepBase {
  kind: "morph";
  title: string;
  /** The rule, e.g. "Spanish ‹-ción› becomes «-zione»". */
  rule: string;
  /** 3–6 pairs. */
  pairs: { es: string; it: string; en: string }[];
}

/** Pick one option. */
export interface ChoiceStep extends StepBase {
  kind: "choice";
  prompt: string;
  /** Optional Italian sentence shown large; may contain ___ for the blank. */
  it?: string;
  /** 2–4 options. */
  options: string[];
  /** Index into options. */
  answer: number;
  explain: string;
}

/** Type a short answer. Matching ignores case, accents and punctuation, then flags accent slips. */
export interface TypeStep extends StepBase {
  kind: "type";
  prompt: string;
  /** Optional Italian sentence with ___ for the blank. */
  it?: string;
  /** Accepted answers. The first is canonical. */
  answers: string[];
  hint?: string;
  explain: string;
}

/** Build an Italian sentence from word tiles. */
export interface BuildStep extends StepBase {
  kind: "build";
  /** English sentence to translate. */
  prompt: string;
  /** Canonical Italian sentence. Tiles are its space-separated words. */
  answer: string;
  /** Other accepted full sentences (same tiles, different order). */
  alt?: string[];
  /** 1–3 wrong tiles mixed in. */
  distractors?: string[];
  explain?: string;
}

/** Tap matching Italian ↔ English pairs. */
export interface MatchStep extends StepBase {
  kind: "match";
  prompt?: string;
  /** 4–5 pairs. */
  pairs: { it: string; en: string }[];
}

/** Hear Italian audio, pick what it means or says. */
export interface ListenStep extends StepBase {
  kind: "listen";
  /** Italian text that is spoken. Not shown until answered. */
  text: string;
  prompt: string;
  options: string[];
  answer: number;
  explain?: string;
}

export type Step =
  | TeachStep
  | MorphStep
  | ChoiceStep
  | TypeStep
  | BuildStep
  | MatchStep
  | ListenStep;

export type ExerciseStep = Exclude<Step, TeachStep | MorphStep>;

export interface VocabItem {
  it: string;
  en: string;
  es?: string;
}

export interface Lesson {
  /** Stable slug, e.g. "milano". Progress is keyed by it. */
  id: string;
  /** Train stop name shown on the journey line. */
  city: string;
  region: string;
  /** Italian title, e.g. "Il ponte". */
  title: string;
  /** English subtitle, e.g. "Spanish → Italian sound rules". */
  subtitle: string;
  /** One sentence shown before starting. */
  summary: string;
  /** Lesson-end recap. 8–14 words or phrases. */
  vocab: VocabItem[];
  steps: Step[];
}

export interface Phrase {
  id: string;
  it: string;
  en: string;
  /** Simple English-reader pronunciation, stress in caps: "dov-AY eel BAHN-yoh". */
  say: string;
  note?: string;
}

export interface PhraseGroup {
  id: string;
  title: string;
  /** Italian label, e.g. "Al bar". */
  it: string;
  phrases: Phrase[];
}

export const isExercise = (s: Step): s is ExerciseStep =>
  s.kind !== "teach" && s.kind !== "morph";
