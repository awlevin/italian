/**
 * Collects every Italian string the app can pass to speak(), keyed exactly as
 * the client keys them (src/lib/audio.ts → audioKey). Shared by gen-audio and
 * check-audio so the two never disagree.
 */
import { course } from "../src/content/course";
import { phrasebook } from "../src/content/phrasebook";
import type { Step } from "../src/content/types";
import { audioKey, MARKUP, plain, sayable } from "../src/lib/text";

// Mirrors src/components/ui/rich.tsx. Keep in sync: only these spans get a speak button.

export interface AudioString {
  key: string;
  /** Plain text sent to TTS (markup stripped, NFC). */
  text: string;
  /** Where it first came from, for logs. */
  source: string;
}

/** Sayable «…» spans exactly as <Rich> would render them. */
function spans(s: string): string[] {
  return s
    .split(MARKUP)
    .filter((p) => p.startsWith("«"))
    .map((p) => p.slice(1, -1))
    .filter(sayable);
}

/** Every string anywhere inside a value, for the «…» sweep. */
function* strings(v: unknown): Generator<string> {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (v && typeof v === "object") for (const x of Object.values(v)) yield* strings(x);
}

/** Strings a step passes to speak() directly (not via «…» spans). */
function direct(step: Step): string[] {
  switch (step.kind) {
    case "teach":
      return step.examples?.map((e) => e.it) ?? [];
    case "morph":
      return step.pairs.map((p) => p.it);
    case "choice":
      // choice.tsx: speak(it.replace("___", plain(options[answer]))); SpeakButton shows `it` as-is when no blank.
      return step.it ? [step.it.replace("___", plain(step.options[step.answer]))] : [];
    case "type": {
      // type.tsx: SpeakButton text={it.replace("___", canonical)}; accent note renders «canonical».
      const canonical = plain(step.answers[0]);
      const out = step.it ? [step.it.replace("___", canonical)] : [];
      if (sayable(canonical)) out.push(canonical);
      return out;
    }
    case "listen":
      return [step.text];
    case "build":
      return [step.answer];
    case "match":
      return step.pairs.map((p) => p.it);
  }
}

export function collectAudioStrings(): AudioString[] {
  const byKey = new Map<string, AudioString>();
  const add = (raw: string, source: string) => {
    const text = plain(raw).normalize("NFC");
    if (!text) return;
    const key = audioKey(text);
    const prev = byKey.get(key);
    if (prev && prev.text !== text) throw new Error(`audioKey collision: "${prev.text}" vs "${text}"`);
    if (!prev) byKey.set(key, { key, text, source });
  };

  for (const lesson of course) {
    for (const v of lesson.vocab) add(v.it, `${lesson.id}/vocab`);
    for (const step of lesson.steps) {
      const src = `${lesson.id}/${step.id}`;
      for (const s of direct(step)) add(s, src);
      for (const s of strings(step)) for (const it of spans(s)) add(it, `${src} «»`);
    }
    for (const s of strings({ ...lesson, steps: [] })) for (const it of spans(s)) add(it, `${lesson.id} «»`);
  }
  for (const group of phrasebook) {
    for (const p of group.phrases) {
      add(p.it, `phrasebook/${p.id}`);
      for (const s of strings(p)) for (const it of spans(s)) add(it, `phrasebook/${p.id} «»`);
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}
