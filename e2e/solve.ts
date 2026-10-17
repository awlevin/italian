import { expect, type Page } from "@playwright/test";
import type { Lesson } from "../src/content/types";
import { plain } from "../src/lib/text";

/** Answers one step correctly, using the content as the answer key. */
export async function solve(page: Page, step: Lesson["steps"][number]) {
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
      // By role, so earlier cards (kept, hidden, for stepping back) don't match.
      const input = page.getByRole("textbox", { name: "Your answer" });
      await input.fill(plain(step.answers[0]));
      await input.press("Enter");
      break;
    }
    case "build":
      for (const word of step.answer.split(/\s+/)) {
        await page.locator('[data-tile="bank"]:visible', { hasText: new RegExp(`^${escape(word)}$`) }).first().click();
      }
      await page.keyboard.press("Enter");
      break;
    case "match":
      for (const p of step.pairs) {
        await page.locator('[data-match="it"]:visible', { hasText: new RegExp(`^${escape(p.it)}$`) }).click();
        await page.locator('[data-match="en"]:visible', { hasText: new RegExp(`^${escape(p.en)}$`) }).click();
      }
      break;
  }
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
