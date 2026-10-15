import { currentUserId } from "@/lib/auth";
import { applyOps } from "@/lib/progress-server";
import { syncBodySchema } from "@/lib/sync";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  // JSON only: a cross-origin page cannot send this content type without a CORS preflight.
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const parsed = syncBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  await applyOps(userId, parsed.data.ops);
  return Response.json({ applied: parsed.data.ops.length });
}
