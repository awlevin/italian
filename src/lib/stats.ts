import type { Snapshot } from "./sync";

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Consecutive days with practice, ending today or yesterday. */
export function streak(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function dueItemIds(s: Snapshot, now = Date.now()): string[] {
  return Object.entries(s.items)
    .filter(([, v]) => Date.parse(v.dueAt) <= now)
    .sort((a, b) => a[1].box - b[1].box || Date.parse(a[1].dueAt) - Date.parse(b[1].dueAt))
    .map(([k]) => k);
}

/** Items answered right at least twice in a row: "you know this". */
export const learnedCount = (s: Snapshot) => Object.values(s.items).filter((v) => v.box >= 2).length;
