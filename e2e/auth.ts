import { config } from "dotenv";
import type { Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });

const API = "https://api.clerk.com/v1";
const EMAIL = "ponte-e2e+clerk_test@example.com";

async function clerk<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Clerk ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Finds (or creates) the dev-instance test user. */
export async function testUserId(): Promise<string> {
  const found = await clerk<{ id: string }[]>(`/users?email_address=${encodeURIComponent(EMAIL)}`);
  if (found[0]) return found[0].id;
  const made = await clerk<{ id: string }>("/users", {
    method: "POST",
    body: JSON.stringify({ email_address: [EMAIL], skip_password_requirement: true }),
  });
  return made.id;
}

/** Signs the page in as the test user with a one-time Clerk ticket. No password involved. */
export async function signIn(page: Page, path = "/") {
  const userId = await testUserId();
  const { token } = await clerk<{ token: string }>("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  await page.goto(path);
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded);
  await page.evaluate(async (ticket) => {
    type C = {
      client: { signIn: { create: (p: object) => Promise<{ createdSessionId: string }> } };
      setActive: (p: object) => Promise<void>;
      user?: unknown;
    };
    const c = (window as unknown as { Clerk: C }).Clerk;
    if (c.user) return;
    const si = await c.client.signIn.create({ strategy: "ticket", ticket });
    await c.setActive({ session: si.createdSessionId });
  }, token);
  await page.goto(path);
}
