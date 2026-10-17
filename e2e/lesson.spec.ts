import { expect, test } from "@playwright/test";
import { allLessons } from "../src/content/course";
import { signIn } from "./auth";
import { solve } from "./solve";

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
