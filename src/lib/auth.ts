import "server-only";
import { auth } from "@clerk/nextjs/server";

/** Returns the signed-in user id, or null. Route handlers answer 401 on null. */
export async function currentUserId(): Promise<string | null> {
  const { isAuthenticated, userId } = await auth();
  return isAuthenticated ? userId : null;
}
