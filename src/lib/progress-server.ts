import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerLog, itemState, lessonProgress, starredPhrase } from "@/db/schema";
import { BOX_MINUTES, MAX_BOX } from "./srs";
import type { Op, Snapshot } from "./sync";

const minutesArray = sql.raw(`ARRAY[${BOX_MINUTES.join(",")}]`);

async function applyOp(userId: string, op: Op) {
  const at = new Date(op.at);
  switch (op.t) {
    case "answer": {
      const inserted = await db
        .insert(answerLog)
        .values({ id: op.id, userId, itemId: op.itemId, correct: op.correct, at })
        .onConflictDoNothing()
        .returning({ id: answerLog.id });
      if (inserted.length === 0) return; // Already applied.
      const firstBox = op.correct ? 1 : 0;
      const newBox = op.correct
        ? sql`LEAST(${itemState.box} + 1, ${MAX_BOX})`
        : sql`0`;
      await db
        .insert(itemState)
        .values({
          userId,
          itemId: op.itemId,
          box: firstBox,
          dueAt: new Date(at.getTime() + BOX_MINUTES[firstBox] * 60_000),
          correct: op.correct ? 1 : 0,
          wrong: op.correct ? 0 : 1,
          lastAt: at,
        })
        .onConflictDoUpdate({
          target: [itemState.userId, itemState.itemId],
          set: {
            box: newBox,
            dueAt: sql`${at.toISOString()}::timestamptz + (${minutesArray})[(${newBox}) + 1] * interval '1 minute'`,
            correct: sql`${itemState.correct} + ${op.correct ? 1 : 0}`,
            wrong: sql`${itemState.wrong} + ${op.correct ? 0 : 1}`,
            lastAt: sql`GREATEST(${itemState.lastAt}, ${at.toISOString()}::timestamptz)`,
          },
        });
      return;
    }
    case "lesson": {
      const completedAt = op.completed ? at : null;
      await db
        .insert(lessonProgress)
        .values({
          userId,
          lessonId: op.lessonId,
          stepIndex: op.stepIndex,
          completedAt,
          bestAccuracy: op.accuracy ?? null,
          updatedAt: at,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: {
            stepIndex: sql`CASE WHEN ${lessonProgress.updatedAt} <= ${at.toISOString()}::timestamptz THEN ${op.stepIndex} ELSE ${lessonProgress.stepIndex} END`,
            completedAt: sql`COALESCE(${lessonProgress.completedAt}, ${completedAt?.toISOString() ?? null}::timestamptz)`,
            bestAccuracy: sql`GREATEST(${lessonProgress.bestAccuracy}, ${op.accuracy ?? null}::real)`,
            updatedAt: sql`GREATEST(${lessonProgress.updatedAt}, ${at.toISOString()}::timestamptz)`,
          },
        });
      return;
    }
    case "star": {
      if (op.on) {
        await db
          .insert(starredPhrase)
          .values({ userId, phraseId: op.phraseId, createdAt: at })
          .onConflictDoNothing();
      } else {
        await db
          .delete(starredPhrase)
          .where(and(eq(starredPhrase.userId, userId), eq(starredPhrase.phraseId, op.phraseId)));
      }
    }
  }
}

/** Applies ops in order. Every op is idempotent, so a retried batch is safe. */
export async function applyOps(userId: string, ops: Op[]) {
  for (const op of ops) await applyOp(userId, op);
}

export async function getSnapshot(userId: string, timeZone: string): Promise<Snapshot> {
  const [lessons, items, stars, days, totals] = await Promise.all([
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.select().from(itemState).where(eq(itemState.userId, userId)),
    db.select().from(starredPhrase).where(eq(starredPhrase.userId, userId)).orderBy(desc(starredPhrase.createdAt)),
    db.execute<{ day: string }>(sql`
      SELECT DISTINCT to_char(${answerLog.at} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day
      FROM ${answerLog} WHERE ${answerLog.userId} = ${userId}
      ORDER BY day DESC LIMIT 400`),
    db
      .select({
        answers: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) FILTER (WHERE ${answerLog.correct})::int`,
      })
      .from(answerLog)
      .where(eq(answerLog.userId, userId)),
  ]);

  return {
    lessons: Object.fromEntries(
      lessons.map((l) => [
        l.lessonId,
        {
          stepIndex: l.stepIndex,
          completedAt: l.completedAt?.toISOString() ?? null,
          bestAccuracy: l.bestAccuracy,
          updatedAt: l.updatedAt.toISOString(),
        },
      ]),
    ),
    items: Object.fromEntries(
      items.map((i) => [
        i.itemId,
        { box: i.box, dueAt: i.dueAt.toISOString(), correct: i.correct, wrong: i.wrong, lastAt: i.lastAt.toISOString() },
      ]),
    ),
    starred: stars.map((s) => s.phraseId),
    days: days.rows.map((r) => r.day),
    totals: totals[0] ?? { answers: 0, correct: 0 },
  };
}
