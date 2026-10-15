import { currentUserId } from "@/lib/auth";
import { applyOps } from "@/lib/progress-server";
import { syncBodySchema } from "@/lib/sync";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = syncBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  await applyOps(userId, parsed.data.ops);
  return Response.json({ applied: parsed.data.ops.length });
}
