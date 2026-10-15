import { z } from "zod";
import type { ItemState } from "./srs";

const iso = z.iso.datetime();

export const opSchema = z.discriminatedUnion("t", [
  z.object({ id: z.string().min(8).max(64), t: z.literal("answer"), at: iso, itemId: z.string().max(120), correct: z.boolean() }),
  z.object({
    id: z.string().min(8).max(64),
    t: z.literal("lesson"),
    at: iso,
    lessonId: z.string().max(60),
    stepIndex: z.number().int().min(0).max(500),
    completed: z.boolean().optional(),
    accuracy: z.number().min(0).max(1).optional(),
  }),
  z.object({ id: z.string().min(8).max(64), t: z.literal("star"), at: iso, phraseId: z.string().max(120), on: z.boolean() }),
]);

export const syncBodySchema = z.object({ ops: z.array(opSchema).max(500) });

export type Op = z.infer<typeof opSchema>;
type Dist<T> = T extends unknown ? Omit<T, "id" | "at"> : never;
export type OpInput = Dist<Op>;

export interface LessonState {
  stepIndex: number;
  completedAt: string | null;
  bestAccuracy: number | null;
  updatedAt: string;
}

export interface Snapshot {
  lessons: Record<string, LessonState>;
  items: Record<string, ItemState>;
  starred: string[];
  /** Local calendar days (YYYY-MM-DD) with at least one answer, newest first. */
  days: string[];
  totals: { answers: number; correct: number };
}

export const emptySnapshot = (): Snapshot => ({
  lessons: {},
  items: {},
  starred: [],
  days: [],
  totals: { answers: 0, correct: 0 },
});
