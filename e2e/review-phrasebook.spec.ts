import { expect, test, type Page } from "@playwright/test";
import type { AddedPhrase, Details } from "../src/lib/added-phrases";
import type { Snapshot } from "../src/lib/sync";
import { signIn } from "./auth";

/*
 * Entries added to the phrasebook come back as review cards, and point at the
 * course rule they use. Phrases, progress and sync are all stubbed: nothing is
 * written for the test user.
 */

const none: Details = {
  kind: "word",
  pos: "other",
  forms: [],
  es: "",
  bridge: "",
  example: { it: "", en: "" },
  parts: [],
  grammar: "",
  rule: "",
};

const entry = (id: string, it: string, en: string, details: Partial<Details>): AddedPhrase => ({
  id,
  query: en,
  status: "ready",
  it,
  en,
  say: "",
  audioUrl: null,
  error: null,
  createdAt: "2026-10-15T10:00:00.000Z",
  details: { ...none, ...details },
});

export const phrases: AddedPhrase[] = [
  entry("e2e-ce", "C'è una farmacia qui vicino?", "Is there a pharmacy near here?", {
    kind: "phrase",
    es: "¿Hay una farmacia cerca?",
    grammar: "«C'è» is ‹hay› for one thing; «ci sono» for several.",
    rule: "firenze/ce-ci-sono",
  }),
  entry("e2e-bagni", "Ci sono dei bagni?", "Are there any toilets?", { kind: "phrase", rule: "firenze/ce-ci-sono" }),
  entry("e2e-tel", "il telefono", "the phone", {
    pos: "noun",
    forms: ["il telefono", "i telefoni"],
    es: "el teléfono",
    bridge: "Same word as ‹teléfono›, with «-o» and no accent.",
    rule: "venezia/teach-singular-articles",
  }),
  entry("e2e-stazione", "la stazione", "the station", {
    pos: "noun",
    forms: ["la stazione", "le stazioni"],
    es: "la estación",
    bridge: "‹-ción› becomes «-zione».",
    rule: "milano/morph-zione",
  }),
  entry("e2e-stanco", "stanco", "tired", { pos: "adjective", forms: ["stanco", "stanca", "stanchi", "stanche"], es: "cansado" }),
  entry("e2e-conto", "Il conto, per favore.", "The bill, please.", { kind: "phrase", rule: "bologna/requests" }),
];

const day = "2026-10-15T10:00:00.000Z";
export const snapshot: Snapshot = {
  lessons: {
    milano: { stepIndex: 20, completedAt: day, bestAccuracy: 0.9, updatedAt: day },
    verona: { stepIndex: 20, completedAt: day, bestAccuracy: 0.9, updatedAt: day },
  },
  // One entry already practised and due again; the rest are new.
  items: { "added/e2e-stanco": { box: 2, dueAt: day, correct: 2, wrong: 0, lastAt: day } },
  starred: [],
  days: [],
  totals: { answers: 2, correct: 2 },
};

export async function stubApis(page: Page) {
  await page.route("**/api/phrases", (route) => route.fulfill({ json: { phrases } }));
  await page.route("**/api/progress*", (route) => route.fulfill({ json: snapshot }));
  await page.route("**/api/sync", (route) => route.fulfill({ json: { applied: 0 } }));
  // Start from the stubbed snapshot, not a copy saved by an earlier run.
  await page.addInitScript(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("ponte:") || k === "ciao:added-phrases") localStorage.removeItem(k);
  });
}

test("turns phrasebook entries into review cards and rules", async ({ page }) => {
  test.skip(test.info().project.name !== "light", "mode-independent");
  await stubApis(page);
  await signIn(page, "/review");

  const card = page.getByRole("region", { name: "From your phrasebook" });
  await expect(card).toContainText("5 new to learn");

  // The rules section: most entries first, unfinished lessons marked New.
  const rule = page.getByRole("link", { name: /C'è, ci sono = hay/ });
  await expect(rule).toContainText("Ci sono dei bagni?");
  await expect(rule).toContainText("New");
  await expect(page.getByRole("link", { name: /Your first free vocabulary/ })).not.toContainText("New");

  // Learning starts a session of their own cards.
  await card.getByRole("button", { name: /Learn 5 new ones/ }).click();
  await expect(page.getByText("Your phrasebook").first()).toBeVisible();
  await page.getByRole("button", { name: "Leave" }).click();

  // A rule opens its lesson running on that card, with the learner's entries under it.
  await page.goto("/review");
  await page.getByRole("link", { name: /C'è, ci sono = hay/ }).click();
  await expect(page).toHaveURL(/\/lesson\/firenze\?step=ce-ci-sono/);
  await expect(page.getByRole("heading", { name: "C'è, ci sono = hay" })).toBeVisible();
  const yours = page.getByRole("complementary", { name: "From your phrasebook" });
  await expect(yours).toContainText("C'è una farmacia qui vicino?");
  await expect(yours).toContainText("Are there any toilets?");
});
