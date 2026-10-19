import type { Details } from "@/lib/added-phrases";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Where the learner is in each lesson. One row per (user, lesson). */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    /** Index of the next step to show. */
    stepIndex: integer("step_index").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    bestAccuracy: real("best_accuracy"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/** Spaced-repetition state per exercise. Item id is "<lessonId>/<stepId>". */
export const itemState = pgTable(
  "item_state",
  {
    userId: text("user_id").notNull(),
    itemId: text("item_id").notNull(),
    box: integer("box").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    correct: integer("correct").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    index("item_state_due_idx").on(t.userId, t.dueAt),
  ],
);

/**
 * Append-only answer log. Source of truth for streaks and stats.
 * Keyed by (user, op id): the id is client-generated, so it is only unique
 * within one user, and one user's ids can never collide with another's.
 */
export const answerLog = pgTable(
  "answer_log",
  {
    /** Client-generated op id: makes sync idempotent. */
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    itemId: text("item_id").notNull(),
    correct: boolean("correct").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] }), index("answer_log_user_at_idx").on(t.userId, t.at)],
);

export const starredPhrase = pgTable(
  "starred_phrase",
  {
    userId: text("user_id").notNull(),
    phraseId: text("phrase_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.phraseId] })],
);

/**
 * Phrases added from the phrasebook's search. Shared: every user sees every
 * ready phrase. `status` moves translating → recording → ready, or to failed.
 */
export const addedPhrase = pgTable(
  "added_phrase",
  {
    id: text("id").primaryKey(),
    /** What was typed into the search, as typed. */
    query: text("query").notNull(),
    /** fold(query): one row per request, so asking twice finds the first. */
    queryKey: text("query_key").notNull().unique(),
    status: text("status").$type<"translating" | "recording" | "ready" | "failed">().notNull(),
    it: text("it"),
    en: text("en"),
    say: text("say"),
    note: text("note"),
    /** Same-origin path of the clip, or null to use the device voice. */
    audioUrl: text("audio_url"),
    error: text("error"),
    /** Word or phrase, and what it teaches (`Details`). Null until described. */
    details: jsonb("details").$type<Details>(),
    /** When describing last started: a lease, so overlapping loads and instances don't ask twice. */
    detailsTriedAt: timestamp("details_tried_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("added_phrase_created_by_idx").on(t.createdBy, t.createdAt)],
);
