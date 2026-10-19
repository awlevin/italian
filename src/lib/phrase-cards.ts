import { allLessons } from "@/content/course";
import { phrasebook } from "@/content/phrasebook";
import type { BuildStep, ChoiceStep, ExerciseStep, ListenStep, TypeStep } from "@/content/types";
import { type AddedPhrase, type Details, kindOf } from "./added-phrases";
import { shuffle } from "./diff";
import { fold } from "./text";

/**
 * Review cards made from the entries added to the phrasebook. Each entry is one
 * spaced-repetition item ("added/<id>"); its card is built when it comes up,
 * and gets harder as the item climbs the boxes: recognise it first, then
 * produce it.
 */

export const ADDED_PREFIX = "added/";
export const cardId = (p: Pick<AddedPhrase, "id">) => ADDED_PREFIX + p.id;

/** Entries that can be practised: written and translated. */
export const practisable = (phrases: AddedPhrase[]) =>
  phrases.filter((p) => p.status === "ready" && p.it.trim() && p.en.trim());

/** Ready entries by the course card ("<lessonId>/<stepId>") that teaches their rule. */
export function byRule(phrases: AddedPhrase[]): Map<string, AddedPhrase[]> {
  const out = new Map<string, AddedPhrase[]>();
  for (const p of practisable(phrases)) {
    const rule = p.details?.rule;
    if (rule) out.set(rule, [...(out.get(rule) ?? []), p]);
  }
  return out;
}

/** Small, stable string hash (FNV-1a), to seed shuffles per entry. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const ARTICLE = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)['’]\s*)/i;
/** "il telefono" → "telefono", "l'acqua" → "acqua". */
export const withoutArticle = (it: string) => it.trim().replace(ARTICLE, "");

/** The words of a sentence as build tiles: no sentence punctuation. */
export const wordsOf = (it: string) =>
  it
    .replace(/[?!.,;:¿¡…"“”«»]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const vocabEn = allLessons.flatMap((l) => l.vocab.map((v) => v.en));
const phrasebookEn = phrasebook.flatMap((g) => g.phrases.map((p) => p.en));
const phrasebookIt = phrasebook.flatMap((g) => g.phrases.map((p) => p.it));

/** Three English meanings that are not this one: other entries like it first, then the course's. */
function distractors(p: AddedPhrase, pool: AddedPhrase[], seed: number): string[] {
  const kind = kindOf(p);
  const others = practisable(pool).filter((o) => o.id !== p.id);
  const lists = [
    others.filter((o) => kindOf(o) === kind).map((o) => o.en),
    others.filter((o) => kindOf(o) !== kind).map((o) => o.en),
    kind === "word" ? vocabEn : phrasebookEn,
    kind === "word" ? phrasebookEn : vocabEn,
  ];
  const seen = new Set([fold(p.en)]);
  const out: string[] = [];
  for (const list of lists) {
    for (const en of shuffle(list, seed)) {
      const key = fold(en);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(en.trim());
      if (out.length === 3) return out;
    }
  }
  return out;
}

/** Four English options, the right one among them. */
function options(p: AddedPhrase, pool: AddedPhrase[], seed: number) {
  const opts = shuffle([p.en.trim(), ...distractors(p, pool, seed)], seed + 1);
  return { options: opts, answer: opts.indexOf(p.en.trim()) };
}

const quote = (it: string) => `«${it}»`;
const formsLine = (d: Details) => (d.forms.length > 1 ? `Forms: ${d.forms.map(quote).join(", ")}.` : "");
const exampleLine = (d: Details) => (d.example.it ? `${quote(d.example.it)} ${d.example.en}` : "");
const partsLine = (d: Details) => d.parts.map((x) => `${quote(x.it)} ${x.en}`).join(" · ");
const fallback = (p: AddedPhrase) => `${quote(p.it)} means “${p.en}”.`;
const join = (...lines: string[]) => lines.filter(Boolean).join(" ");

function chooseMeaning(p: AddedPhrase, pool: AddedPhrase[], seed: number): ChoiceStep {
  const d = p.details;
  return {
    kind: "choice",
    id: p.id,
    prompt: `What does ${quote(p.it)} mean?`,
    ...options(p, pool, seed),
    explain: (d && (d.bridge || exampleLine(d))) || fallback(p),
  };
}

function typeWord(p: AddedPhrase): TypeStep {
  const d = p.details;
  const bare = withoutArticle(p.it);
  // Nouns count without their article too: "telefono" for "il telefono".
  const noun = d ? d.pos === "noun" : bare !== p.it.trim();
  return {
    kind: "type",
    id: p.id,
    prompt: `Say it in Italian: “${p.en.trim()}”`,
    answers: noun && bare && fold(bare) !== fold(p.it) ? [p.it.trim(), bare] : [p.it.trim()],
    hint: d?.es ? `In Spanish: ‹${d.es}›` : undefined,
    explain: (d && join(d.bridge, formsLine(d))) || fallback(p),
  };
}

function listenPhrase(p: AddedPhrase, pool: AddedPhrase[], seed: number): ListenStep {
  const d = p.details;
  return {
    kind: "listen",
    id: p.id,
    text: p.it,
    prompt: "What does it mean?",
    ...options(p, pool, seed),
    explain: (d && (d.grammar || d.bridge || partsLine(d))) || fallback(p),
  };
}

function buildPhrase(p: AddedPhrase, pool: AddedPhrase[], seed: number): BuildStep {
  const d = p.details;
  const words = wordsOf(p.it);
  const inAnswer = new Set(words.map(fold));
  const others = practisable(pool).filter((o) => o.id !== p.id && kindOf(o) === "phrase");
  const extra: string[] = [];
  const want = words.length > 4 ? 2 : 1;
  for (const list of [others.map((o) => o.it), phrasebookIt]) {
    for (const w of shuffle(list.flatMap(wordsOf), seed)) {
      const key = fold(w);
      if (!key || inAnswer.has(key)) continue;
      inAnswer.add(key);
      extra.push(w.toLowerCase());
      if (extra.length === want) break;
    }
    if (extra.length === want) break;
  }
  return {
    kind: "build",
    id: p.id,
    prompt: p.en.trim(),
    answer: words.join(" "),
    distractors: extra,
    explain: (d && (d.grammar || d.bridge || partsLine(d))) || undefined,
  };
}

/**
 * The card for an added entry at its spaced-repetition box. Words: pick the
 * meaning, then (box 2+) type the Italian. Phrases: hear it and pick the
 * meaning, then (box 2+) build it from tiles. One-word phrases stay a choice,
 * and very long ones stay a listen.
 */
export function cardFor(p: AddedPhrase, pool: AddedPhrase[], box: number | undefined): ExerciseStep {
  const seed = hash(`${p.id}:${box ?? 0}`);
  const later = (box ?? 0) >= 2;
  if (kindOf(p) === "word") return later ? typeWord(p) : chooseMeaning(p, pool, seed);
  const n = wordsOf(p.it).length;
  if (n <= 1) return chooseMeaning(p, pool, seed);
  if (n > 9 || !later) return listenPhrase(p, pool, seed);
  return buildPhrase(p, pool, seed);
}
