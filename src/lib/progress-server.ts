import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerLog, itemState, lessonProgress, starredPhrase } from "@/db/schema";
import { BOX_MINUTES, MAX_BOX } from "./srs";
import type { Op, Snapshot } from "./sync";

const minutesArray = sql.raw(`ARRAY[${BOX_MINUTES.join(",")}]`);

type AnswerOp = Extract<Op, { t: "answer" }>;

/**
 * Logs one answer and moves its item through the Leitner boxes, in a single
 * statement: the item only moves when the log insert is new, so a retried op
 * is a no-op and the two tables can never disagree.
 */
function answerQuery(userId: string, op: AnswerOp) {
  const at = sql`${op.at}::timestamptz`;
  const hit = op.correct ? 1 : 0; // A first answer lands in box 1 if right, box 0 if wrong.
  const firstDue = new Date(Date.parse(op.at) + BOX_MINUTES[hit] * 60_000).toISOString();
  const newBox = op.correct ? sql`LEAST(${itemState.box} + 1, ${MAX_BOX}::int)` : sql`0`;
  return db.execute(sql`
    WITH logged AS (
      INSERT INTO ${answerLog} (user_id, id, item_id, correct, at)
      VALUES (${userId}, ${op.id}, ${op.itemId}, ${op.correct}::boolean, ${at})
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    INSERT INTO ${itemState} (user_id, item_id, box, due_at, correct, wrong, last_at)
    SELECT ${userId}::text, ${op.itemId}::text, ${hit}::int, ${firstDue}::timestamptz, ${hit}::int, ${1 - hit}::int, ${at}
    FROM logged
    ON CONFLICT (user_id, item_id) DO UPDATE SET
      box = ${newBox},
      due_at = ${at} + (${minutesArray})[(${newBox}) + 1] * interval '1 minute',
      correct = ${itemState.correct} + ${hit}::int,
      wrong = ${itemState.wrong} + ${1 - hit}::int,
      last_at = GREATEST(${itemState.lastAt}, ${at})`);
}

function opQuery(userId: string, op: Op) {
  const at = new Date(op.at);
  switch (op.t) {
    case "answer":
      return answerQuery(userId, op);
    case "lesson": {
      const completedAt = op.completed ? at : null;
      return db
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
    }
    case "star":
      return op.on
        ? db.insert(starredPhrase).values({ userId, phraseId: op.phraseId, createdAt: at }).onConflictDoNothing()
        : db
            .delete(starredPhrase)
            .where(and(eq(starredPhrase.userId, userId), eq(starredPhrase.phraseId, op.phraseId)));
  }
}

/**
 * Applies ops in order, in one transaction and one round trip to the database.
 * Every op is idempotent, so a retried batch is safe; a failed batch changes nothing.
 */
export async function applyOps(userId: string, ops: Op[]) {
  const [first, ...rest] = ops.map((op) => opQuery(userId, op));
  if (first) await db.batch([first, ...rest]);
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
