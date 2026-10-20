/**
 * Static checks for course content. Run: pnpm content:lint
 *
 * Catches what TypeScript cannot: broken markup, unfair or unanswerable
 * exercises, duplicate ids, and lessons that miss the required exercise mix.
 * Exits 1 with one line per problem.
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { course } from "../src/content/course";
import { grammar } from "../src/content/grammar";
import { phrasebook } from "../src/content/phrasebook";
import { ruleById } from "../src/content/rules";
import { trip } from "../src/content/trip";
import type { Lesson, Step, Table } from "../src/content/types";
import { fold, MARKUP } from "../src/lib/text";

const ROOT = resolve(__dirname, "..");
const problems: string[] = [];
const fail = (where: string, msg: string) => problems.push(`${where}: ${msg}`);

// ── Markup ───────────────────────────────────────────────────────────────────
const MARKERS = /[«»‹›]|~~|\*\*/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Rich text: every marker must belong to a well-formed span, and spans must not nest. */
function checkRich(where: string, s: string) {
  const parts = s.split(MARKUP);
  for (const [i, p] of parts.entries()) {
    if (i % 2 === 0) {
      if (MARKERS.test(p)) fail(where, `unbalanced markup near "${p.trim().slice(0, 40)}"`);
    } else {
      const edge = /^[«‹]/.test(p) ? 1 : 2;
      if (MARKERS.test(p.slice(edge, -edge))) fail(where, `nested markup in "${p}"`);
    }
  }
  if (s.includes("___")) fail(where, "blank ___ outside an exercise `it` sentence");
}

/** Plain text: rendered without <Rich>, so markup would show as raw characters. */
function checkPlain(where: string, s: string | undefined) {
  if (s === undefined) return;
  if (MARKERS.test(s)) fail(where, `markup in a plain-text field: "${s}"`);
  if (s.includes("___")) fail(where, "blank ___ in a plain-text field");
  if (s !== s.trim() || /\s{2,}/.test(s)) fail(where, "stray whitespace");
  if (!s.trim()) fail(where, "empty string");
}

function checkTable(where: string, t: Table | undefined) {
  if (!t) return;
  checkPlain(`${where}.caption`, t.caption);
  // An empty corner cell (pronoun column) is fine.
  t.head.forEach((h, i) => h && checkPlain(`${where}.head[${i}]`, h));
  t.rows.forEach((r, i) => {
    if (r.length !== t.head.length) fail(`${where}.rows[${i}]`, `${r.length} cells, header has ${t.head.length}`);
    r.forEach((c, j) => checkRich(`${where}.rows[${i}][${j}]`, c));
  });
}

/** Sentences in a teach body, ignoring punctuation inside «…» / ‹…› spans. */
const sentences = (s: string) =>
  s.replace(/«[^»]*»|‹[^›]*›/g, "X").split(/(?<=[.!?])\s+(?=[A-Z«‹*])/).filter((x) => x.trim()).length;

const tiles = (s: string) => s.split(/\s+/).map((w) => w.toLowerCase());
const sameMultiset = (a: string[], b: string[]) => [...a].sort().join("\u0000") === [...b].sort().join("\u0000");

/** Exercise `it` sentence: Rich text, plus at most one blank. */
function checkSentence(where: string, s: string | undefined, needsBlank: boolean) {
  if (s === undefined) return;
  const blanks = s.split("___").length - 1;
  if (blanks > 1) fail(where, `${blanks} blanks; only one is supported`);
  if (needsBlank && blanks === 0) fail(where, "no ___ blank");
  checkRich(where, s.replace("___", ""));
}

function checkOptions(where: string, options: string[], answer: number) {
  if (options.length < 2 || options.length > 4) fail(where, `${options.length} options (want 2–4)`);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) fail(where, `answer ${answer} out of range`);
  const seen = new Set<string>();
  options.forEach((o, i) => {
    checkRich(`${where}.options[${i}]`, o);
    const k = fold(o);
    if (seen.has(k)) fail(where, `duplicate option "${o}"`);
    seen.add(k);
    if (o.includes("~~")) fail(`${where}.options[${i}]`, "~~ in an option gives the answer away");
  });
  // Mixed styling (some «Italian», some plain) also gives the answer away.
  const marked = options.filter((o) => /^«[^»]+»$/.test(o.trim())).length;
  if (marked && marked !== options.length) fail(where, "options mix «…» and plain styling");
}

// ── Steps ────────────────────────────────────────────────────────────────────
function checkStep(lesson: Lesson, step: Step) {
  const at = `${lesson.id}/${step.id}`;
  if (!KEBAB.test(step.id)) fail(at, "step id is not kebab-case");

  switch (step.kind) {
    case "teach": {
      checkPlain(`${at}.title`, step.title);
      checkRich(`${at}.body`, step.body);
      const n = sentences(step.body);
      if (n > 3) fail(`${at}.body`, `${n} sentences (want 1–3; move depth into \`more\`)`);
      if (step.tip) checkRich(`${at}.tip`, step.tip);
      step.examples?.forEach((e, i) => {
        checkPlain(`${at}.examples[${i}].it`, e.it);
        checkPlain(`${at}.examples[${i}].en`, e.en);
        checkPlain(`${at}.examples[${i}].es`, e.es);
        if (e.note) checkRich(`${at}.examples[${i}].note`, e.note);
      });
      checkTable(`${at}.table`, step.table);
      if (step.more) {
        checkPlain(`${at}.more.label`, step.more.label);
        checkRich(`${at}.more.body`, step.more.body);
        checkTable(`${at}.more.table`, step.more.table);
      }
      break;
    }
    case "morph": {
      checkPlain(`${at}.title`, step.title);
      checkRich(`${at}.rule`, step.rule);
      if (step.pairs.length < 3 || step.pairs.length > 6) fail(at, `${step.pairs.length} pairs (want 3–6)`);
      step.pairs.forEach((p, i) => {
        checkPlain(`${at}.pairs[${i}].es`, p.es);
        checkPlain(`${at}.pairs[${i}].it`, p.it);
        checkPlain(`${at}.pairs[${i}].en`, p.en);
      });
      break;
    }
    case "choice": {
      checkRich(`${at}.prompt`, step.prompt);
      checkSentence(`${at}.it`, step.it, true);
      checkOptions(at, step.options, step.answer);
      if (step.it && /[‹›]/.test(step.options[step.answer] ?? "")) fail(at, "answer fills the blank but is not Italian");
      checkRich(`${at}.explain`, step.explain);
      break;
    }
    case "listen": {
      checkPlain(`${at}.text`, step.text);
      checkRich(`${at}.prompt`, step.prompt);
      checkOptions(at, step.options, step.answer);
      if (step.explain) checkRich(`${at}.explain`, step.explain);
      break;
    }
    case "type": {
      checkRich(`${at}.prompt`, step.prompt);
      checkSentence(`${at}.it`, step.it, true);
      if (!step.answers.length) fail(at, "no answers");
      const seen = new Set<string>();
      step.answers.forEach((a, i) => {
        checkPlain(`${at}.answers[${i}]`, a);
        if (seen.has(a.toLowerCase())) fail(at, `duplicate answer "${a}"`);
        seen.add(a.toLowerCase());
        if (a.split(/\s+/).length > 5) fail(`${at}.answers[${i}]`, "longer than 5 words: hard to type on a phone");
      });
      if (step.hint) checkRich(`${at}.hint`, step.hint);
      checkRich(`${at}.explain`, step.explain);
      break;
    }
    case "build": {
      checkRich(`${at}.prompt`, step.prompt);
      checkPlain(`${at}.answer`, step.answer);
      const answer = tiles(step.answer);
      if (answer.length < 4 || answer.length > 9) fail(at, `${answer.length} tiles (want 4–9)`);
      if (/[.!]$/.test(step.answer)) fail(`${at}.answer`, "trailing punctuation");
      const all = [step.answer, ...(step.alt ?? [])];
      if (new Set(all.map(fold)).size !== all.length) fail(at, "alt repeats the answer or another alt");
      step.alt?.forEach((a, i) => {
        checkPlain(`${at}.alt[${i}]`, a);
        if (!sameMultiset(tiles(a), answer)) fail(`${at}.alt[${i}]`, "uses different tiles from the answer");
      });
      const d = step.distractors ?? [];
      if (d.length > 3) fail(at, `${d.length} distractors (want 1–3)`);
      d.forEach((x, i) => {
        checkPlain(`${at}.distractors[${i}]`, x);
        if (/\s/.test(x)) fail(`${at}.distractors[${i}]`, "a tile must be one word");
        if (answer.includes(x.toLowerCase())) fail(`${at}.distractors[${i}]`, `"${x}" is also an answer tile`);
      });
      if (new Set(d.map((x) => x.toLowerCase())).size !== d.length) fail(at, "duplicate distractors");
      if (step.explain) checkRich(`${at}.explain`, step.explain);
      break;
    }
    case "match": {
      if (step.prompt) checkRich(`${at}.prompt`, step.prompt);
      if (step.pairs.length < 4 || step.pairs.length > 5) fail(at, `${step.pairs.length} pairs (want 4–5)`);
      const its = new Set(step.pairs.map((p) => fold(p.it)));
      const ens = new Set(step.pairs.map((p) => fold(p.en)));
      if (its.size !== step.pairs.length) fail(at, "duplicate Italian side");
      if (ens.size !== step.pairs.length) fail(at, "duplicate English side");
      step.pairs.forEach((p, i) => {
        checkPlain(`${at}.pairs[${i}].it`, p.it);
        checkPlain(`${at}.pairs[${i}].en`, p.en);
      });
      break;
    }
  }
}

// ── Lessons ──────────────────────────────────────────────────────────────────
// Course and trip share one id space: progress is keyed by lesson id.
const lessonIds = new Set<string>();
function checkLesson(lesson: Lesson) {
  const at = lesson.id;
  if (lessonIds.has(lesson.id)) fail(at, "duplicate lesson id (across course and trip)");
  lessonIds.add(lesson.id);
  if (!KEBAB.test(lesson.id)) fail(at, "lesson id is not kebab-case");

  for (const f of ["city", "region", "title", "subtitle", "summary"] as const) checkPlain(`${at}.${f}`, lesson[f]);

  if (lesson.vocab.length < 8 || lesson.vocab.length > 14) fail(at, `${lesson.vocab.length} vocab items (want 8–14)`);
  const vocab = new Set<string>();
  lesson.vocab.forEach((v, i) => {
    checkPlain(`${at}.vocab[${i}].it`, v.it);
    checkPlain(`${at}.vocab[${i}].en`, v.en);
    checkPlain(`${at}.vocab[${i}].es`, v.es);
    if (vocab.has(v.it)) fail(at, `duplicate vocab "${v.it}"`);
    vocab.add(v.it);
  });

  const stepIds = new Set<string>();
  let run = 0;
  for (const step of lesson.steps) {
    if (stepIds.has(step.id)) fail(at, `duplicate step id "${step.id}"`);
    stepIds.add(step.id);
    run = step.kind === "teach" || step.kind === "morph" ? run + 1 : 0;
    if (run > 2) fail(`${at}/${step.id}`, "third concept card in a row: add an exercise between");
    checkStep(lesson, step);
  }

  const count = (k: Step["kind"]) => lesson.steps.filter((s) => s.kind === k).length;
  for (const k of ["listen", "build", "match"] as const) if (count(k) < 1) fail(at, `no ${k} exercise`);
  if (count("type") < 2) fail(at, `${count("type")} type exercises (want ≥ 2)`);
  const last = lesson.steps.at(-1);
  if (last && (last.kind === "teach" || last.kind === "morph")) fail(at, "ends on a concept card, not an exercise");
}

for (const lesson of course) checkLesson(lesson);
for (const lesson of trip) {
  checkLesson(lesson);
  if (!lesson.id.startsWith("trip-")) fail(lesson.id, 'trip lesson id must start with "trip-"');
}

// Every lesson file must be on its line, under its own id.
function checkFiles(dir: string, lessons: Lesson[], registry: string) {
  const ids = new Set(lessons.map((l) => l.id));
  const files = readdirSync(join(ROOT, "src/content", dir)).filter((f) => f.endsWith(".ts") && f !== "index.ts");
  for (const f of files) if (!ids.has(f.replace(/\.ts$/, ""))) fail(`${dir}/${f}`, `file is not in ${registry}, or its id differs from the file name`);
}
checkFiles("lessons", course, "course.ts");
checkFiles("trip", trip, "trip/index.ts");

// ── Phrasebook ───────────────────────────────────────────────────────────────
const groupIds = new Set<string>();
const phraseIds = new Set<string>();
for (const g of phrasebook) {
  if (groupIds.has(g.id)) fail(`phrasebook/${g.id}`, "duplicate group id");
  groupIds.add(g.id);
  if (!KEBAB.test(g.id)) fail(`phrasebook/${g.id}`, "group id is not kebab-case");
  checkPlain(`phrasebook/${g.id}.title`, g.title);
  checkPlain(`phrasebook/${g.id}.it`, g.it);
  if (!g.phrases.length) fail(`phrasebook/${g.id}`, "empty group");
  for (const p of g.phrases) {
    const at = `phrasebook/${p.id}`;
    if (phraseIds.has(p.id)) fail(at, "duplicate phrase id");
    phraseIds.add(p.id);
    if (!KEBAB.test(p.id)) fail(at, "phrase id is not kebab-case");
    checkPlain(`${at}.it`, p.it);
    checkPlain(`${at}.en`, p.en);
    checkPlain(`${at}.say`, p.say);
    checkPlain(`${at}.note`, p.note);
  }
}

// ── Grammar reference ────────────────────────────────────────────────────────
const sectionIds = new Set<string>();
for (const g of grammar) {
  const at = `grammar/${g.id}`;
  if (sectionIds.has(g.id)) fail(at, "duplicate section id");
  sectionIds.add(g.id);
  if (!KEBAB.test(g.id)) fail(at, "section id is not kebab-case");
  checkPlain(`${at}.it`, g.it);
  checkPlain(`${at}.title`, g.title);
  checkRich(`${at}.body`, g.body);
  if (!g.tables.length) fail(at, "no tables");
  g.tables.forEach((t, i) => checkTable(`${at}.tables[${i}]`, t));
  g.notes?.forEach((n, i) => checkRich(`${at}.notes[${i}]`, n));
  if (g.rule && !ruleById.has(g.rule)) fail(at, `rule "${g.rule}" is not a teach or morph card`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\nContent lint failed: ${problems.length} problem(s).`);
  process.exit(1);
}
const steps = [...course, ...trip].reduce((n, l) => n + l.steps.length, 0);
console.log(`Content OK: ${course.length} lessons + ${trip.length} trip lessons, ${steps} steps, ${phraseIds.size} phrases.`);
