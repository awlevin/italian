/**
 * Leitner-style spaced repetition, tuned for a short trip: intervals start
 * tiny so a same-day review session is meaningful.
 * Shared by the client (optimistic) and the server (authoritative).
 */
export const BOX_MINUTES = [1, 10, 60, 8 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60] as const;
export const MAX_BOX = BOX_MINUTES.length - 1;

export interface ItemState {
  box: number;
  dueAt: string;
  correct: number;
  wrong: number;
  lastAt: string;
}

export function nextBox(box: number | undefined, correct: boolean): number {
  if (!correct) return 0;
  return Math.min((box ?? 0) + 1, MAX_BOX);
}

export function applyAnswer(prev: ItemState | undefined, correct: boolean, at: string): ItemState {
  const box = nextBox(prev?.box, correct);
  return {
    box,
    dueAt: new Date(Date.parse(at) + BOX_MINUTES[box] * 60_000).toISOString(),
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    lastAt: at,
  };
}

/** 0 (new / shaky) … 1 (solid). */
export const strength = (s: ItemState | undefined) => (s ? s.box / MAX_BOX : 0);
