/** Strip inline markup to plain text. */
export const plain = (s: string) =>
  s.replace(/[«»‹›]/g, "").replace(/\*\*|~~/g, "").replace(/\s+/g, " ").trim();

/** Fold for lenient comparison: lowercase, no accents, no punctuation, single spaces. */
export const fold = (s: string) =>
  plain(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Like fold but keeps accents: used to detect "right word, wrong accent". */
export const foldKeepAccents = (s: string) =>
  plain(s)
    .normalize("NFC")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export type Grade = "exact" | "accent" | "wrong";

export function gradeTyped(input: string, answers: string[]): { grade: Grade; match: string } {
  const exact = answers.find((a) => foldKeepAccents(a) === foldKeepAccents(input));
  if (exact) return { grade: "exact", match: exact };
  const loose = answers.find((a) => fold(a) === fold(input));
  if (loose) return { grade: "accent", match: loose };
  return { grade: "wrong", match: answers[0] };
}

/** Stable short hash (cyrb53) for audio file names. Same in Node and browser. */
export function audioKey(text: string): string {
  const str = plain(text).normalize("NFC");
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
