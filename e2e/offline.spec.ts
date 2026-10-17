import { expect, test } from "@playwright/test";
import { allLessons } from "../src/content/course";
import { signIn } from "./auth";

/*
 * Offline mode needs the service worker, which only registers in production:
 * run against `pnpm build && pnpm start --port 3311`.
 */
test("downloads everything, then works with no network", async ({ page, context }) => {
  test.skip(test.info().project.name !== "light", "mode-independent");
  await signIn(page, "/");

  const hasWorker = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  test.skip(!hasWorker, "service worker is production-only");
  await page.evaluate(() => navigator.serviceWorker.ready);

  const card = page.getByRole("region", { name: "Offline" });
  await expect(card).toHaveAttribute("data-offline", /idle|ready|downloading/, { timeout: 30_000 });
  if ((await card.getAttribute("data-offline")) === "idle") await card.getByRole("button", { name: "Download" }).click();
  await expect(card).toHaveAttribute("data-offline", "ready", { timeout: 120_000 });

  // On a crawling connection, the saved page still opens straight away.
  await context.route("**/*", async (route) => {
    await new Promise((r) => setTimeout(r, 8_000));
    await route.continue().catch(() => {});
  });
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 4_000 });
  // ...and moving between tabs doesn't hang on the stalled network.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Phrasebook" }).click();
  await expect(page.getByRole("heading", { name: "Phrasebook" })).toBeVisible({ timeout: 6_000 });
  await context.unrouteAll({ behavior: "ignoreErrors" });
  await page.goto("/");

  await context.setOffline(true);

  // A cold load of the home page still opens, signed in.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Offline · saved on device")).toBeVisible();

  // Tabs still navigate.
  await page.getByRole("link", { name: "Phrasebook" }).click();
  await expect(page).toHaveURL(/\/phrasebook$/);
  await expect(page.getByRole("link", { name: "Lessons" })).toBeVisible();

  // A lesson opens from a cold load, and progress made offline is kept.
  const lesson = allLessons.find((l) => l.steps[0].kind === "teach")!;
  await page.goto(`/lesson/${lesson.id}`);
  const start = page.getByRole("button", { name: /Start|Partenza|Ride again|Riprendi/ }).last();
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter"); // Past the first teach card.
  const queued = () =>
    page.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ponte:outbox:"))
        .reduce((n, k) => n + JSON.parse(localStorage.getItem(k)!).length, 0),
    );
  await expect.poll(queued).toBeGreaterThan(0);

  // Audio is served from the cache, including the byte ranges Safari asks for.
  const audio = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.active) return null;
    const keys = await (await caches.open("ciao-audio-v1")).keys();
    const url = new URL(keys[0].url).pathname;
    const full = await fetch(url);
    const part = await fetch(url, { headers: { Range: "bytes=0-99" } });
    return { full: full.status, part: part.status, len: (await part.arrayBuffer()).byteLength };
  });
  expect(audio).toEqual({ full: 200, part: 206, len: 100 });

  // Back online, the queued progress reaches the server.
  await context.setOffline(false);
  await expect.poll(queued, { timeout: 30_000 }).toBe(0);
});
