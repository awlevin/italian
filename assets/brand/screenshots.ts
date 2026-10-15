/**
 * Takes the README screenshots from the real app, signed in as the e2e test
 * user, and mounts them on the plaster wall (light) and the lapis vault (dark).
 * Also records the noche → notte sound rule as a GIF.
 *
 *   pnpm dev --port 3311          # in another terminal
 *   pnpm screenshots              # → assets/screenshots/
 *
 * Progress is stubbed in the browser: /api/progress answers with a made-up
 * mid-course snapshot and /api/sync swallows writes, so every run shows the
 * same state and the test user's real progress is never touched.
 * The GIF needs ffmpeg on PATH; without it, that step is skipped.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { course } from "../../src/content/course";
import { isExercise } from "../../src/content/types";
import { BOX_MINUTES } from "../../src/lib/srs";
import type { Snapshot } from "../../src/lib/sync";
import { signIn } from "../../e2e/auth";

const BASE = process.env.E2E_BASE ?? "http://localhost:3311";
const ROOT = resolve(__dirname, "../..");
const OUT = join(ROOT, "assets/screenshots");
const RAW = join(ROOT, ".tmp/shots");
const PHONE = { ...devices["iPhone 15"], deviceScaleFactor: 2 };

// ── A believable learner: four stops done, halfway through the fifth ─────────
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const now = Date.now();
const iso = (t: number) => new Date(t).toISOString();
const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const lessonIndex = (lessonId: string, stepId: string) =>
  course.find((l) => l.id === lessonId)!.steps.findIndex((s) => s.id === stepId);

function snapshot(resume?: { lesson: string; step: string }): Snapshot {
  const done = ["milano", "verona", "venezia", "bologna"];
  const s: Snapshot = { lessons: {}, items: {}, starred: ["ristorante-conto", "bar-un-caffe"], days: [], totals: { answers: 0, correct: 0 } };
  done.forEach((id, i) => {
    s.lessons[id] = { stepIndex: 0, completedAt: iso(now - (4 - i) * DAY), bestAccuracy: [0.92, 0.88, 0.95, 0.9][i], updatedAt: iso(now - (4 - i) * DAY) };
    const lesson = course.find((l) => l.id === id)!;
    lesson.steps.filter(isExercise).forEach((step, j) => {
      const box = 1 + ((i + j) % 5);
      // Three cards are due now, the rest later.
      const due = i === 3 && j < 3 ? now - 5 * MIN : now + BOX_MINUTES[box] * MIN;
      s.items[`${id}/${step.id}`] = { box, dueAt: iso(due), correct: box, wrong: j % 3 === 0 ? 1 : 0, lastAt: iso(now - DAY) };
      s.totals.answers += box + (j % 3 === 0 ? 1 : 0);
      s.totals.correct += box;
    });
  });
  s.lessons.firenze = { stepIndex: 7, completedAt: null, bestAccuracy: null, updatedAt: iso(now - 2 * 60 * MIN) };
  if (resume) s.lessons[resume.lesson] = { stepIndex: lessonIndex(resume.lesson, resume.step), completedAt: null, bestAccuracy: null, updatedAt: iso(now - MIN) };
  s.days = [0, 1, 2, 3].map((d) => dayKey(now - d * DAY));
  return s;
}

/** Serves `state.snapshot` as the user's progress and accepts every write. */
async function stubProgress(context: BrowserContext, state: { snapshot: Snapshot }) {
  await context.route("**/api/progress*", (route) => route.fulfill({ json: state.snapshot }));
  await context.route("**/api/sync", async (route) => {
    const body = route.request().postDataJSON() as { ops: unknown[] };
    await route.fulfill({ json: { applied: body.ops.length } });
  });
}

const settle = (page: Page, ms = 2500) => page.waitForTimeout(ms);

/** Opens a lesson with progress parked on `step` and presses Riprendi. */
async function openAt(page: Page, state: { snapshot: Snapshot }, lesson: string, step: string) {
  state.snapshot = snapshot({ lesson, step });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/lesson/${lesson}`);
  await page.getByRole("button", { name: /Riprendi/ }).click();
}

async function shoot(browser: Browser, scheme: "light" | "dark") {
  const context = await browser.newContext({ ...PHONE, colorScheme: scheme, baseURL: BASE });
  const state = { snapshot: snapshot() };
  await stubProgress(context, state);
  const page = await context.newPage();
  const raw = (name: string) => join(RAW, `${scheme}-${name}.png`);

  await signIn(page, "/");
  await settle(page);
  await page.screenshot({ path: raw("journey") });

  await openAt(page, state, "milano", "morph-tt");
  await settle(page, 4500); // Six words, staggered: the last lands at about 3.4 s.
  await page.screenshot({ path: raw("morph") });

  await openAt(page, state, "milano", "build-universita");
  await settle(page, 800);
  const step = course.find((l) => l.id === "milano")!.steps[lessonIndex("milano", "build-universita")];
  if (step.kind !== "build") throw new Error("milano/build-universita is not a build step");
  for (const word of step.answer.split(/\s+/)) {
    await page.locator('[data-tile="bank"]', { hasText: new RegExp(`^${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first().click();
    await page.waitForTimeout(120);
  }
  await page.keyboard.press("Enter");
  await settle(page, 1500);
  await page.screenshot({ path: raw("build") });

  state.snapshot = snapshot();
  await page.goto("/phrasebook");
  await settle(page, 1200);
  await page.locator("[role=button][aria-expanded]", { hasText: "Il conto, per favore" }).first().click();
  await page.getByRole("button", { name: "Show someone" }).click();
  await settle(page, 1200);
  await page.screenshot({ path: raw("show") });

  await context.close();
}

/** Records the sound-rule card turning Spanish into Italian, the whole phone screen. */
async function recordMorph(browser: Browser) {
  const dir = join(RAW, "video");
  rmSync(dir, { recursive: true, force: true });
  // Video frames are captured at 1× CSS pixels whatever the device scale.
  const context = await browser.newContext({ ...PHONE, colorScheme: "light", baseURL: BASE, recordVideo: { dir, size: PHONE.viewport } });
  const state = { snapshot: snapshot() };
  await stubProgress(context, state);
  const page = await context.newPage();
  await signIn(page, "/");
  await openAt(page, state, "milano", "morph-tt");
  await settle(page, 4800);
  await context.close();

  const video = join(dir, readdirSync(dir).find((f) => f.endsWith(".webm"))!);
  const filter =
    // Denoise first: the plaster grain plus video noise would change every pixel every frame.
    `tpad=stop_mode=clone:stop_duration=1.5,hqdn3d=6:6:10:10,fps=15,split[a][b];` +
    `[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
  // Skip the sign-in: start at the Riprendi click. Hold the last frame before the loop.
  const duration = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]);
  const start = Math.max(0, Number(duration.toString().trim()) - 4.8);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", start.toFixed(2), "-i", video, "-vf", filter, "-loop", "0", join(OUT, "sound-rule.gif")]);
}

/** Phone frames side by side on the app's own wall. */
async function mount(browser: Browser, names: string[], scheme: "light" | "dark", out: string) {
  const bg = scheme === "light" ? "#eceef3" : "#0c1129";
  const ring = scheme === "light" ? "rgb(19 26 51 / 0.08)" : "rgb(255 255 255 / 0.08)";
  const data = (n: string) => `data:image/png;base64,${readFileSync(join(RAW, `${scheme}-${n}.png`)).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0">
    <div id="wall" style="display:inline-flex;gap:56px;padding:64px 72px;background:${bg}">
      ${names
        .map(
          (n) => `<img src="${data(n)}" style="display:block;width:${(1800 - 144 - 56 * (names.length - 1)) / names.length}px;
            border-radius:44px;box-shadow:0 0 0 2px ${ring},0 30px 60px -24px rgb(0 0 0 / .35)">`,
        )
        .join("")}
    </div></body>`);
  await page.locator("#wall").screenshot({ path: join(OUT, out) });
  await page.close();
}

async function main() {
  mkdirSync(RAW, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await shoot(browser, "light");
    await shoot(browser, "dark");
    await mount(browser, ["journey", "morph", "show"], "light", "phones-light.png");
    await mount(browser, ["journey", "build", "show"], "dark", "phones-dark.png");
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      await recordMorph(browser);
    } catch (e) {
      console.warn(`skipped sound-rule.gif: ${(e as Error).message.split("\n")[0]}`);
    }
  } finally {
    await browser.close();
  }
  for (const f of readdirSync(OUT)) console.log(`  ${f.padEnd(20)} ${(statSync(join(OUT, f)).size / 1024).toFixed(0)} KB`);
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
