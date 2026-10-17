import { expect, test } from "@playwright/test";
import type { AddedPhrase } from "../src/lib/added-phrases";
import { signIn } from "./auth";

/*
 * Searching for a missing phrase offers to add it, shows its progress and
 * then lists it. The API is stubbed: no model or voice is called.
 */
test("adds a phrase that search can't find", async ({ page }) => {
  test.skip(test.info().project.name !== "light", "mode-independent");
  const base: AddedPhrase = {
    id: "added-e2e",
    query: "charge my phone",
    status: "translating",
    it: "charge my phone",
    en: "",
    say: "",
    audioUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  const ready: AddedPhrase = {
    ...base,
    status: "ready",
    it: "Dove posso ricaricare il telefono?",
    en: "Where can I charge my phone?",
    say: "DOH-veh POHS-soh ree-kah-ree-KAH-reh eel teh-LEH-foh-noh",
  };
  let phrases: AddedPhrase[] = [];
  let polls = 0;
  await page.route("**/api/phrases", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ query: "charge my phone" });
      phrases = [base];
      return route.fulfill({ status: 202, json: { phrase: base } });
    }
    // Two polls translating, two recording, then ready.
    if (phrases.length) phrases = [++polls < 2 ? base : polls < 4 ? { ...base, status: "recording" } : ready];
    return route.fulfill({ json: { phrases } });
  });

  await signIn(page, "/phrasebook");
  await page.getByRole("searchbox", { name: "Search phrases" }).fill("charge my phone");
  await expect(page.getByText("No phrase matches “charge my phone” yet.")).toBeVisible();
  await page.getByRole("button", { name: "Add “charge my phone”" }).click();

  await expect(page.getByText("Translating…")).toBeVisible();
  await expect(page.getByText("Recording the audio…")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Dove posso ricaricare il telefono?")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Add “/ })).toHaveCount(0);

  // It stays in the phrasebook, under Added.
  await page.getByRole("searchbox", { name: "Search phrases" }).fill("");
  await expect(page.locator(`section#aggiunte`)).toContainText("Where can I charge my phone?");
});
