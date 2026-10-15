import {
  boolean,
  index,
  integer,
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

/** Append-only answer log. Source of truth for streaks and stats. */
export const answerLog = pgTable(
  "answer_log",
  {
    /** Client-generated op id: makes sync idempotent. */
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    itemId: text("item_id").notNull(),
    correct: boolean("correct").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [index("answer_log_user_at_idx").on(t.userId, t.at)],
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
