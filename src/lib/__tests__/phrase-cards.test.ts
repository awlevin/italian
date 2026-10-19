import { describe, expect, it } from "vitest";
import type { AddedPhrase, Details } from "@/lib/added-phrases";
import { byRule, cardFor, cardId, practisable, withoutArticle, wordsOf } from "@/lib/phrase-cards";
import { fold } from "@/lib/text";

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

function entry(id: string, it: string, en: string, details: Partial<Details> | null = null, status: AddedPhrase["status"] = "ready"): AddedPhrase {
  return {
    id,
    query: en,
    status,
    it,
    en,
    say: "",
    audioUrl: null,
    error: null,
    createdAt: "2026-10-15T10:00:00.000Z",
    details: details && { ...none, ...details },
  };
}

const telefono = entry("w1", "il telefono", "the phone", { pos: "noun", forms: ["il telefono", "i telefoni"], es: "el teléfono" });
const acqua = entry("w2", "l'acqua", "the water", { pos: "noun", forms: ["l'acqua"] });
const stanco = entry("w3", "stanco", "tired", { pos: "adjective", forms: ["stanco", "stanca", "stanchi", "stanche"] });
const ricaricare = entry("p1", "Dove posso ricaricare il telefono?", "Where can I charge my phone?", {
  kind: "phrase",
  grammar: "«posso» + infinitive, like ‹puedo›.",
  rule: "milano/x",
});
const conto = entry("p2", "Il conto, per favore.", "The bill, please.", { kind: "phrase" });
const pending = entry("p3", "charge it", "Charge it", null, "translating");
const failed = entry("w4", "cosa", "Not ready", { pos: "noun" }, "failed");
const pool = [telefono, acqua, stanco, ricaricare, conto, pending, failed];

describe("phrase cards", () => {
  it("keys items under added/", () => {
    expect(cardId(telefono)).toBe("added/w1");
    expect(cardFor(telefono, pool, 0).id).toBe("w1");
  });

  it("asks new words for their meaning with four distinct options", () => {
    for (const pl of [pool, [telefono]]) {
      const card = cardFor(telefono, pl, undefined);
      if (card.kind !== "choice") throw new Error(card.kind);
      expect(card.options).toHaveLength(4);
      expect(new Set(card.options.map(fold)).size).toBe(4);
      expect(card.options[card.answer]).toBe("the phone");
    }
  });

  it("hears new phrases with four distinct options", () => {
    const card = cardFor(ricaricare, pool, 1);
    if (card.kind !== "listen") throw new Error(card.kind);
    expect(card.text).toBe(ricaricare.it);
    expect(new Set(card.options.map(fold)).size).toBe(4);
    expect(card.options[card.answer]).toBe(ricaricare.en);
    expect(card.explain).toContain("posso");
  });

  it("never offers entries that are not ready", () => {
    for (let box = 0; box < 2; box++) {
      const card = cardFor(conto, pool, box);
      if (card.kind !== "listen") throw new Error(card.kind);
      expect(card.options).not.toContain("Charge it");
      expect(card.options).not.toContain("Not ready");
    }
    expect(practisable(pool).map((p) => p.id)).toEqual(["w1", "w2", "w3", "p1", "p2"]);
  });

  it("types known nouns with or without the article", () => {
    const card = cardFor(telefono, pool, 2);
    if (card.kind !== "type") throw new Error(card.kind);
    expect(card.prompt).toBe("Say it in Italian: “the phone”");
    expect(card.answers).toEqual(["il telefono", "telefono"]);
    expect(card.hint).toContain("el teléfono");
    const water = cardFor(acqua, pool, 3);
    expect(water.kind === "type" && water.answers).toEqual(["l'acqua", "acqua"]);
    const tired = cardFor(stanco, pool, 2);
    expect(tired.kind === "type" && tired.answers).toEqual(["stanco"]);
  });

  it("builds known phrases from their own words plus a stranger", () => {
    const card = cardFor(ricaricare, pool, 2);
    if (card.kind !== "build") throw new Error(card.kind);
    expect(card.answer).toBe("Dove posso ricaricare il telefono");
    expect(card.answer.split(/\s+/)).toEqual(wordsOf(ricaricare.it));
    expect(card.prompt).toBe(ricaricare.en);
    const words = new Set(card.answer.split(/\s+/).map(fold));
    expect(card.distractors?.length).toBeGreaterThan(0);
    for (const d of card.distractors ?? []) expect(words.has(fold(d))).toBe(false);
  });

  it("keeps one-word and very long phrases as choices and listens", () => {
    const salute = entry("p4", "Salute!", "Cheers!", { kind: "phrase" });
    expect(cardFor(salute, pool, 3).kind).toBe("choice");
    const long = entry("p5", "Mi scusi, sa dirmi dove si trova la fermata dell'autobus più vicina?", "Where is the nearest bus stop?", {
      kind: "phrase",
    });
    expect(cardFor(long, pool, 4).kind).toBe("listen");
  });

  it("is stable for the same entry and box", () => {
    expect(cardFor(conto, pool, 0)).toEqual(cardFor(conto, pool, 0));
  });

  it("groups ready entries by rule", () => {
    expect([...byRule([...pool, entry("p6", "Posso?", "May I?", { kind: "phrase", rule: "milano/x" }, "recording")])]).toEqual([
      ["milano/x", [ricaricare]],
    ]);
  });

  it("strips articles and punctuation", () => {
    expect(withoutArticle("Gli amici")).toBe("amici");
    expect(withoutArticle("un'amica")).toBe("amica");
    expect(wordsOf("¿Sì, grazie!")).toEqual(["Sì", "grazie"]);
  });
});
