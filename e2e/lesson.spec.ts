import { expect, test, type Page } from "@playwright/test";
import { allLessons } from "../src/content/course";
import type { Lesson } from "../src/content/types";
import { plain } from "../src/lib/text";
import { signIn } from "./auth";

/** Answers one step correctly, using the content as the answer key. */
async function solve(page: Page, step: Lesson["steps"][number]) {
  switch (step.kind) {
    case "teach":
    case "morph":
      await page.keyboard.press("Enter");
      return;
    case "choice":
    case "listen":
      await page.keyboard.press(String(step.answer + 1));
      break;
    case "type": {
      const input = page.getByLabel("Your answer");
      await input.fill(plain(step.answers[0]));
      await input.press("Enter");
      break;
    }
    case "build":
      for (const word of step.answer.split(/\s+/)) {
        await page.locator('[data-tile="bank"]', { hasText: new RegExp(`^${escape(word)}$`) }).first().click();
      }
      await page.keyboard.press("Enter");
      break;
    case "match":
      for (const p of step.pairs) {
        await page.locator('[data-match="it"]', { hasText: new RegExp(`^${escape(p.it)}$`) }).click();
        await page.locator('[data-match="en"]', { hasText: new RegExp(`^${escape(p.en)}$`) }).click();
      }
      break;
  }
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.describe.configure({ mode: "serial" });

for (const lesson of allLessons) {
  test(`completes ${lesson.id} with every answer right`, async ({ page }) => {
    test.skip(test.info().project.name !== "light", "content is mode-independent");
    await signIn(page, `/lesson/${lesson.id}`);
    const start = page.getByRole("button", { name: /Start|Partenza|Ride again/ }).last();
    await expect(start).toBeEnabled();
    await start.click();

    for (const step of lesson.steps) {
      await page.waitForTimeout(250); // Let the card transition settle.
      await solve(page, step);
    }

    await expect(page.getByRole("heading", { name: "Well done!" })).toBeVisible();
    // Progress reached the server.
    await expect
      .poll(async () => page.evaluate(async (id) => {
        const r = await fetch("/api/progress");
        const s = await r.json();
        return !!s.lessons[id]?.completedAt;
      }, lesson.id), { timeout: 15_000 })
      .toBe(true);
  });
}
