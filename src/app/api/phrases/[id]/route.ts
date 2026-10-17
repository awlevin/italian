import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addedPhrase } from "@/db/schema";
import { currentUserId } from "@/lib/auth";

/**
 * Removes an added phrase for everyone (a bad translation, a typo). Its clip
 * stays in Blob: another phrase may say the same words.
 */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/phrases/[id]">) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  await db.delete(addedPhrase).where(eq(addedPhrase.id, id));
  return new Response(null, { status: 204 });
}
