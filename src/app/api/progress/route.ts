import { currentUserId } from "@/lib/auth";
import { getSnapshot } from "@/lib/progress-server";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const tz = new URL(req.url).searchParams.get("tz") ?? "UTC";
  const snapshot = await getSnapshot(userId, isTimeZone(tz) ? tz : "UTC");
  return Response.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
}
