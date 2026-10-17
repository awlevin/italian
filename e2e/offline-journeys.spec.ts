import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { allLessons, lines } from "../src/content/course";
import type { Snapshot } from "../src/lib/sync";
import { signIn } from "./auth";
import { solve } from "./solve";

/*
 * Real journeys with zero network, then a reconnect. The service worker only
 * registers in production: run against `pnpm build && pnpm start --port 3311`.
 */


/** Signs in and downloads everything, as a user would before a flight. */
async function setUp(page: Page) {
  test.skip(test.info().project.name !== "light", "mode-independent");
  await signIn(page, "/");
  const hasWorker = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  test.skip(!hasWorker, "service worker is production-only");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const card = page.getByRole("region", { name: "Offline" });
  await expect(card).toHaveAttribute("data-offline", /idle|ready|downloading/, { timeout: 30_000 });
  if ((await card.getAttribute("data-offline")) === "idle") await card.getByRole("button", { name: "Download" }).click();
  await expect(card).toHaveAttribute("data-offline", "ready", { timeout: 120_000 });
}

const server = (page: Page) =>
  page.evaluate(async () => (await (await fetch("/api/progress", { cache: "no-store" })).json()) as Snapshot);

/** Ops waiting to sync. -1 while the page is mid-navigation (the app may reload itself to refresh sign-in). */
const queued = (page: Page) =>
  page
    .evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ponte:outbox:"))
        .reduce((n, k) => n + JSON.parse(localStorage.getItem(k)!).length, 0),
    )
    .catch(() => -1);

async function reconnect(page: Page, context: BrowserContext) {
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => queued(page), { timeout: 30_000 }).toBe(0);
}

const tab = (page: Page, name: RegExp | string) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });

/** Opens a lesson's intro and starts it from the first card. */
async function startLesson(page: Page, id: string) {
  await page.goto(`/lesson/${id}`);
  const fresh = page.getByRole("button", { name: "Start from the beginning" });
  const start = page.getByRole("button", { name: /^(Start|Ride again)/ });
  await expect(fresh.or(start).first()).toBeEnabled({ timeout: 15_000 });
  await ((await fresh.isVisible()) ? fresh : start).click();
  await page.waitForTimeout(300);
}

const course = lines[0].lessons;

test("tabs, links and settings all work with no network", async ({ page, context }) => {
  await setUp(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 15_000 });

  for (const [name, heading] of [
    [/^Review/, "Review"],
    ["Phrasebook", "Phrasebook"],
    ["Lessons", "Stops"],
    ["Phrasebook", "Phrasebook"],
    [/^Review/, "Review"],
    ["Lessons", "Stops"],
  ] as const) {
    await tab(page, name).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 6_000 });
  }

  // A stop on the line opens its lesson, and its back link returns home.
  await page.getByRole("link", { name: new RegExp(`^${course[1].city}`) }).click();
  await expect(page.getByRole("button", { name: /Start|Ride again|Resume/ }).first()).toBeVisible({ timeout: 6_000 });
  await page.getByRole("link", { name: "Lessons" }).click();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 6_000 });

  // Menu language and line choice stick across a cold restart, offline.
  await page.getByRole("tab", { name: "My trip" }).click();
  await page.getByRole("tab", { name: "Italiano" }).click();
  await page.reload();
  await expect(tab(page, "Lezioni")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Il mio viaggio" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "English" }).click();
  await page.getByRole("tab", { name: "Course" }).click();
  await expect(tab(page, "Lessons")).toBeVisible();

  // Unknown or query-string URLs never hang.
  await page.goto("/review?s=1");
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible({ timeout: 6_000 });
  const res = await page.goto("/lesson/not-a-real-stop");
  expect(res?.status()).toBeGreaterThanOrEqual(200);
  await expect(page.locator("body")).not.toBeEmpty();
});

test("leave a lesson halfway offline, resume after a restart, sync on reconnect", async ({ page, context }) => {
  await setUp(page);
  const lesson = course.find((l) => l.steps.length > 6)!;
  await context.setOffline(true);
  await startLesson(page, lesson.id);
  for (const step of lesson.steps.slice(0, 3)) {
    await solve(page, step);
    await page.waitForTimeout(250);
  }

  await page.getByRole("button", { name: "Leave", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Leave the lesson?" });
  await expect(dialog).toContainText("card 4");
  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 6_000 });

  // The app is closed and reopened, still with no network: the seat is still saved.
  // (The test user has finished every lesson, which offers "Ride again" rather
  // than "Resume", so check the saved position itself.)
  await page.goto(`/lesson/${lesson.id}`);
  await page.reload();
  await expect(page.getByRole("button", { name: /Ride again|Resume · card 4 of/ })).toBeVisible({ timeout: 15_000 });
  const seat = await page.evaluate((id) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("ponte:outbox:"))!;
    const ops = JSON.parse(localStorage.getItem(key)!) as { t: string; lessonId?: string; stepIndex?: number }[];
    return ops.filter((o) => o.t === "lesson" && o.lessonId === id).at(-1)?.stepIndex;
  }, lesson.id);
  expect(seat).toBe(3);

  await reconnect(page, context);
  expect((await server(page)).lessons[lesson.id]?.stepIndex).toBe(3);
});

test("finish a whole lesson while the connection flaps, and lose nothing", async ({ page, context }) => {
  // Record every answer the app queues, so the server's count can be checked exactly.
  await page.addInitScript(() => {
    const seen = new Set<string>();
    (window as unknown as { __answers: Set<string> }).__answers = seen;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k.startsWith("ponte:outbox:")) for (const op of JSON.parse(v)) if (op.t === "answer") seen.add(op.id);
      return set.call(this, k, v);
    };
  });
  await setUp(page);
  const before = (await server(page)).totals.answers;
  const t0 = new Date().toISOString();
  const lesson = [...allLessons].sort((a, b) => a.steps.length - b.steps.length)[0];

  await startLesson(page, lesson.id);
  let off = false;
  for (const step of lesson.steps) {
    off = !off;
    await context.setOffline(off);
    await page.waitForTimeout(250);
    await solve(page, step);
  }
  await expect(page.getByRole("heading", { name: "Well done!" })).toBeVisible();

  await reconnect(page, context);
  const answers = await page.evaluate(() => (window as unknown as { __answers: Set<string> }).__answers.size);
  const after = await server(page);
  expect(after.totals.answers - before).toBe(answers);
  expect(after.lessons[lesson.id].updatedAt >= t0).toBe(true);
});

test("a review session offline counts once it reconnects", async ({ page, context }) => {
  await setUp(page);
  const before = (await server(page)).totals.answers;
  await context.setOffline(true);
  await tab(page, /^Review/).click();
  await page.getByRole("button", { name: /^Review \d+ cards?|Practice weakest/ }).click();
  await expect(tab(page, "Lessons")).toHaveCount(0);

  // Answer cards until one answer is queued, whatever kind of card it is.
  const start = await queued(page);
  for (let i = 0; i < 6 && (await queued(page)) === start; i++) {
    await answerAnything(page);
  }
  expect(await queued(page)).toBeGreaterThan(start);
  const answered = (await queued(page)) - start;

  await page.getByRole("button", { name: "Leave", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Leave the lesson?" });
  if (await confirm.isVisible()) await confirm.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible({ timeout: 6_000 });
  await expect(tab(page, "Lessons")).toBeVisible();

  await reconnect(page, context);
  expect((await server(page)).totals.answers - before).toBe(answered);
});

test("the phrasebook works offline and saved phrases sync", async ({ page, context }) => {
  await setUp(page);
  await context.setOffline(true);
  await tab(page, "Phrasebook").click();
  await expect(page.getByRole("heading", { name: "Phrasebook" })).toBeVisible({ timeout: 6_000 });

  await page.getByRole("searchbox", { name: "Search phrases" }).or(page.getByLabel("Search phrases")).first().fill("grazie");
  const row = page.getByRole("main").locator("[aria-expanded]").first();
  await row.click();
  const save = page.getByRole("button", { name: /^(Save|Saved)$/ }).first();
  const wasOn = (await save.getAttribute("aria-pressed")) === "true";
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", String(!wasOn));

  await page.getByRole("button", { name: "Show someone" }).first().click();
  await page.getByRole("button", { name: "Close" }).click();

  await reconnect(page, context);
  const starred = (await server(page)).starred;
  expect(starred.length > 0 || wasOn).toBe(true);
});

/** Gets past the current card with some answer, right or wrong. */
async function answerAnything(page: Page) {
  const cont = page.getByRole("button", { name: "Continue" });
  const next = page.getByRole("button", { name: /^(Got it|Got the pattern|Check)$/ });
  const typeBox = page.getByRole("textbox", { name: "Your answer" });
  const bank = page.locator('[data-tile="bank"]:visible');
  const matchIt = page.locator('[data-match="it"]:visible');

  if (await matchIt.first().isVisible()) {
    const its = await matchIt.allInnerTexts();
    const step = allLessons
      .flatMap((l) => l.steps)
      .find((s) => s.kind === "match" && its.every((t) => s.pairs.some((p) => p.it === t.trim())));
    if (step) return solve(page, step);
  }
  if (await typeBox.isVisible()) {
    await typeBox.fill("non lo so");
    await typeBox.press("Enter");
  } else if (await bank.first().isVisible()) {
    for (const t of await bank.all()) if (await t.isVisible()) await t.click();
    await page.keyboard.press("Enter");
  } else if (await next.isVisible()) {
    await next.click();
    return;
  } else {
    await page.keyboard.press("1");
  }
  await expect(cont).toBeVisible();
  await cont.click();
  await page.waitForTimeout(250);
}

test("after hours offline (sign-in token expired), progress still syncs on reconnect", async ({ page, context }) => {
  await setUp(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 15_000 });
  await tab(page, "Phrasebook").click();
  await page.getByLabel("Search phrases").fill("grazie");
  await page.getByRole("main").locator("[aria-expanded]").first().click();
  await page.getByRole("button", { name: /^(Save|Saved)$/ }).first().click();
  await expect.poll(() => queued(page)).toBeGreaterThan(0);

  // Clerk's session token lives about a minute; hours offline means it's gone.
  const cookies = await context.cookies();
  await context.clearCookies();
  await context.addCookies(cookies.filter((c) => c.name !== "__session" && !c.name.startsWith("__session_")));

  await reconnect(page, context);
  await expect(page.getByRole("heading", { name: "Phrasebook" })).toBeVisible();
});

test("leaving and moving on from a lesson work offline", async ({ page, context }) => {
  await setUp(page);
  const lesson = [...course].slice(0, -1).sort((a, b) => a.steps.length - b.steps.length)[0];
  const next = course[course.indexOf(lesson) + 1];
  await context.setOffline(true);

  // Finish a lesson, then take the next stop.
  await startLesson(page, lesson.id);
  for (const step of lesson.steps) {
    await solve(page, step);
    await page.waitForTimeout(250);
  }
  await expect(page.getByRole("heading", { name: "Well done!" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`Prossima fermata: ${next.city}`) }).click();
  await expect(page.getByRole("heading", { name: next.city })).toBeVisible({ timeout: 6_000 });

  // Start it, answer one card, and leave.
  await startLesson(page, next.id);
  await solve(page, next.steps[0]);
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave the lesson?" }).getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 6_000 });

  // Finish again and go back to the journey.
  await startLesson(page, lesson.id);
  for (const step of lesson.steps) {
    await solve(page, step);
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: "Back to the journey" }).click();
  await expect(page.getByRole("heading", { name: "Stops" })).toBeVisible({ timeout: 6_000 });

  await reconnect(page, context);
});
