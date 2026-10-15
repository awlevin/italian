import { describe, expect, it } from "vitest";
import { reduce } from "@/components/progress/store";
import { charDiff } from "@/lib/diff";
import { applyAnswer, BOX_MINUTES, MAX_BOX } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { emptySnapshot, type Op } from "@/lib/sync";
import { audioKey, fold, gradeTyped } from "@/lib/text";

describe("gradeTyped", () => {
  it("accepts exact answers ignoring case and punctuation", () => {
    expect(gradeTyped("  Il Conto, per favore! ", ["il conto per favore"]).grade).toBe("exact");
  });
  it("flags accent slips as correct-with-note", () => {
    expect(gradeTyped("citta", ["città"]).grade).toBe("accent");
    expect(gradeTyped("perche", ["perché"]).grade).toBe("accent");
  });
  it("rejects wrong words", () => {
    expect(gradeTyped("solucione", ["soluzione"])).toEqual({ grade: "wrong", match: "soluzione" });
  });
  it("normalizes apostrophes", () => {
    expect(fold("Quant’è")).toBe(fold("quant'è"));
    expect(gradeTyped("l' acqua", ["l'acqua"]).grade).toBe("exact");
  });
});

describe("charDiff", () => {
  it("keeps accent-only differences as kept letters", () => {
    const d = charDiff("nación", "nazione");
    const it = d.filter((t) => t.type !== "del").map((t) => t.ch).join("");
    const es = d.filter((t) => t.type !== "ins").map((t) => t.src ?? t.ch).join("");
    expect(it).toBe("nazione");
    expect(es).toBe("nación");
    expect(d.find((t) => t.src === "ó")?.type).toBe("keep");
  });
});

describe("srs", () => {
  const t0 = "2026-10-15T10:00:00.000Z";
  it("promotes on correct and resets on wrong", () => {
    const a = applyAnswer(undefined, true, t0);
    expect(a.box).toBe(1);
    expect(Date.parse(a.dueAt) - Date.parse(t0)).toBe(BOX_MINUTES[1] * 60_000);
    const b = applyAnswer(a, false, t0);
    expect(b).toMatchObject({ box: 0, correct: 1, wrong: 1 });
  });
  it("caps at the top box", () => {
    let s = applyAnswer(undefined, true, t0);
    for (let i = 0; i < 20; i++) s = applyAnswer(s, true, t0);
    expect(s.box).toBe(MAX_BOX);
  });
});

describe("progress reduce", () => {
  const op = (o: Partial<Op> & Pick<Op, "t">, at = "2026-10-15T10:00:00.000Z") => ({ id: crypto.randomUUID(), at, ...o }) as Op;

  it("tracks answers, totals and days", () => {
    const s = reduce(emptySnapshot(), op({ t: "answer", itemId: "milano/x", correct: true }));
    expect(s.totals).toEqual({ answers: 1, correct: 1 });
    expect(s.items["milano/x"].box).toBe(1);
    expect(s.days).toHaveLength(1);
  });
  it("lesson ops are last-write-wins and completion is sticky", () => {
    let s = reduce(emptySnapshot(), op({ t: "lesson", lessonId: "milano", stepIndex: 20, completed: true, accuracy: 0.8 }, "2026-10-15T10:00:00.000Z"));
    s = reduce(s, op({ t: "lesson", lessonId: "milano", stepIndex: 3 }, "2026-10-15T09:00:00.000Z"));
    expect(s.lessons.milano.stepIndex).toBe(20);
    s = reduce(s, op({ t: "lesson", lessonId: "milano", stepIndex: 0, accuracy: 0.5 }, "2026-10-15T11:00:00.000Z"));
    expect(s.lessons.milano).toMatchObject({ stepIndex: 0, bestAccuracy: 0.8 });
    expect(s.lessons.milano.completedAt).not.toBeNull();
  });
  it("stars toggle", () => {
    let s = reduce(emptySnapshot(), op({ t: "star", phraseId: "a", on: true }));
    s = reduce(s, op({ t: "star", phraseId: "b", on: true }));
    s = reduce(s, op({ t: "star", phraseId: "a", on: false }));
    expect(s.starred).toEqual(["b"]);
  });
});

describe("streak", () => {
  const now = new Date(2026, 9, 15, 12);
  it("counts consecutive days ending today or yesterday", () => {
    expect(streak(["2026-10-15", "2026-10-14", "2026-10-12"], now)).toBe(2);
    expect(streak(["2026-10-14", "2026-10-13"], now)).toBe(2);
    expect(streak(["2026-10-12"], now)).toBe(0);
  });
});

describe("audioKey", () => {
  it("is stable and ignores markup", () => {
    expect(audioKey("«Buongiorno»")).toBe(audioKey("Buongiorno"));
    expect(audioKey("Buongiorno")).not.toBe(audioKey("Buonasera"));
  });
});
