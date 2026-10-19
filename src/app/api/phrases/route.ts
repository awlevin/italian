import { and, count, desc, eq, gt, ne, or } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { addedPhrase } from "@/db/schema";
import { addPhraseSchema, type AddedPhrase, isPending, STALE_MS } from "@/lib/added-phrases";
import { currentUserId } from "@/lib/auth";
import { describeMissing, generatePhrase } from "@/lib/phrase-gen";
import { fold } from "@/lib/text";

/** Long enough for the model and the recording, which run after the response. */
export const maxDuration = 60;

/** Plenty for two people; stops a stuck loop from running up the bill. */
const DAILY_LIMIT = 40;

type Row = typeof addedPhrase.$inferSelect;

function toPhrase(r: Row): AddedPhrase {
  const stale = isPending(r) && Date.now() - r.updatedAt.getTime() > STALE_MS;
  return {
    id: r.id,
    query: r.query,
    status: stale ? "failed" : r.status,
    it: r.it ?? r.query,
    en: r.en ?? "",
    say: r.say ?? "",
    note: r.note ?? undefined,
    audioUrl: r.audioUrl,
    error: stale ? "That took too long. Try again." : r.error,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
  };
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

/** Every added phrase, newest first: ready and in-progress ones from anyone, failed ones only to whoever asked. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return json({ error: "unauthenticated" }, 401);

  const rows = await db
    .select()
    .from(addedPhrase)
    .where(or(ne(addedPhrase.status, "failed"), eq(addedPhrase.createdBy, userId)))
    .orderBy(desc(addedPhrase.createdAt))
    .limit(500);
  // Phrases added before entries had details get them in the background; the next load shows them.
  const undescribed = rows.filter((r) => r.status === "ready" && !r.details);
  if (undescribed.length) after(() => describeMissing(undescribed));
  return json({ phrases: rows.map(toPhrase) });
}

/** Asks for a phrase. Answers at once with the row; the phrase is written and recorded after. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "unauthenticated" }, 401);
  // JSON only: a cross-origin page cannot send this content type without a CORS preflight.
  if (!req.headers.get("content-type")?.startsWith("application/json")) return json({ error: "unsupported_media_type" }, 415);

  const parsed = addPhraseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const query = parsed.data.query;
  const queryKey = fold(query);
  if (!queryKey) return json({ error: "bad_request" }, 400);

  const [existing] = await db.select().from(addedPhrase).where(eq(addedPhrase.queryKey, queryKey));
  if (existing) {
    const phrase = toPhrase(existing);
    // Already there, or on its way.
    if (phrase.status !== "failed") return json({ phrase });
  }

  const [{ n }] = await db
    .select({ n: count() })
    .from(addedPhrase)
    .where(and(eq(addedPhrase.createdBy, userId), gt(addedPhrase.updatedAt, new Date(Date.now() - 86_400_000))));
  if (n >= DAILY_LIMIT) return json({ error: "limit", message: "That's a lot of new phrases for one day. Try again tomorrow." }, 429);

  const now = new Date();
  const fresh = { query, status: "translating" as const, it: null, en: null, say: null, note: null, audioUrl: null, error: null, details: null, createdBy: userId, updatedAt: now };
  const [row] = existing
    ? await db.update(addedPhrase).set(fresh).where(eq(addedPhrase.id, existing.id)).returning()
    : await db
        .insert(addedPhrase)
        .values({ id: `added-${crypto.randomUUID().slice(0, 8)}`, queryKey, createdAt: now, ...fresh })
        .onConflictDoNothing()
        .returning();
  // Lost a race with the same request from the other phone: theirs is already running.
  if (!row) {
    const [other] = await db.select().from(addedPhrase).where(eq(addedPhrase.queryKey, queryKey));
    return json({ phrase: toPhrase(other) });
  }

  after(() => generatePhrase(row.id, query));
  return json({ phrase: toPhrase(row) }, 202);
}
