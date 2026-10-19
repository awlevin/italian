import "server-only";
import { put } from "@vercel/blob";
import { generateText, Output } from "ai";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import manifest from "@/content/audio-manifest.json";
import { db } from "@/db";
import { addedPhrase } from "@/db/schema";
import { ruleById, rules } from "@/content/rules";
import { DESCRIBE_LEASE_MS, type Details, detailsSchema } from "./added-phrases";
import { audioKey, plain } from "./text";
import { forSpeech, LANGUAGE_CODE, MODEL_ID, OUTPUT_FORMAT, SEED, VOICE_ID, VOICE_SETTINGS } from "./voice";

/**
 * Turns a search into a phrasebook entry: a model writes the phrase through
 * Vercel AI Gateway (no key on Vercel: the deployment's OIDC token pays for it),
 * then ElevenLabs reads it in the app's voice and the clip goes to Vercel Blob.
 */

/** Claude first. The gateway falls back in order when a model is unavailable (e.g. no paid credits). */
const MODEL = process.env.PHRASE_MODEL ?? "anthropic/claude-sonnet-5.5";
const FALLBACK_MODELS = ["openai/gpt-5-mini"];

const builtInClips = new Set<string>(manifest.keys);

const draftSchema = z.object({
  ok: z.boolean().describe("False when the request is not something a traveller could say or need in Italian."),
  it: z.string().describe("The Italian phrase, as a native speaker would say it."),
  en: z.string().describe("Short English meaning."),
  say: z.string().describe("English-reader pronunciation, stressed syllables in caps."),
  note: z.string().describe("One short practical tip, or empty when there is nothing worth saying."),
});

const SYSTEM = `You write entries for a phrasebook in a travel app. The learners are English speakers who also speak Spanish, on a trip to Italy. They searched the phrasebook for something and found nothing, so they asked for it to be added.

The request may be in English, Spanish or Italian, and may be a whole sentence, a few keywords, a single word or topic ("the culture", "pharmacy") or a situation ("ask for the wifi password"). Write the one Italian phrase they most likely want to say. A bare word or topic is fine: give the word itself with its article, like "La cultura", or a short phrase built on it when that is clearly more useful.

Rules:
- it: natural, polite spoken Italian, as you would say it to a stranger, a waiter or a clerk (Lei form). Sentence case, standard punctuation, correct accents. Keep it short.
- en: a short English meaning in sentence case, like "Where's the bathroom?". Use " / " for a second meaning.
- say: pronunciation for an English reader, stressed syllables in CAPS, words separated by spaces, syllables by hyphens.
- note: at most one short sentence of practical advice (when to use it, what you'll hear back, a cultural catch). Leave it empty unless it helps.
- Fix spelling mistakes in the request. If the request is already Italian, correct it if needed and use it.
- ok is false only for gibberish or abusive requests. When in doubt, write the entry: a plain word is always something to say.

Examples of entries:
{"it":"Il conto, per favore","en":"The bill, please","say":"eel KOHN-toh, pehr fah-VOH-reh","note":"It won't come until you ask. A per-person 'coperto' on it is normal."}
{"it":"Dov'è il bagno?","en":"Where's the bathroom?","say":"doh-VEH eel BAHN-yoh","note":"In a bar, buy something first; it's only fair."}
{"it":"Contiene glutine?","en":"Does it contain gluten?","say":"kohn-TYEH-neh GLOO-tee-neh","note":"Look for 'senza glutine' on menus; Italy is good at it."}
{"it":"La cultura","en":"The culture","say":"lah kool-TOO-rah","note":""}
{"it":"Può parlare più piano?","en":"Can you speak more slowly?","say":"pwoh par-LAH-reh pyoo PYAH-noh","note":""}`;

class UserFacingError extends Error {}

async function draft(query: string) {
  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM,
    prompt: `Request: ${query}`,
    output: Output.object({ schema: draftSchema }),
    providerOptions: {
      gateway: { models: FALLBACK_MODELS },
      // A short phrase needs no long think: this keeps the fallback to a couple of seconds.
      openai: { reasoningEffort: "minimal" },
    },
    maxRetries: 2,
  });
  if (!output.ok || !plain(output.it)) throw new UserFacingError("That doesn't look like something to say. Try other words.");
  const clean = (s: string) => plain(s).normalize("NFC");
  return { it: clean(output.it), en: clean(output.en), say: clean(output.say), note: clean(output.note) || null };
}

const DESCRIBE = `You annotate entries in an Italian phrasebook. The learner is an English speaker who also speaks Spanish well, so Spanish is the bridge: much Italian is a sound rule away from a Spanish word they already know. They looked the entry up while travelling and want to learn from it, not just say it. Write all explanations in English.

Decide what the entry is:
- word: a single word, or a word with its article ("Il telefono", "La cultura", "Ricaricare", "Stanco"). Fill pos, forms and example.
- phrase: anything longer, a question or a set expression ("Buon appetito!"). Fill parts and grammar.

Fields:
- forms: nouns ["il telefono", "i telefoni"] (singular and plural with articles). Verbs ["ricaricare", "io ricarico", "ho ricaricato"] (infinitive, io present, passato prossimo so the auxiliary shows). Adjectives ["stanco", "stanca", "stanchi", "stanche"]. Otherwise empty.
- example: a short everyday sentence using the word that a traveller would really say or hear, with its English.
- es: the Spanish equivalent, as short as the entry.
- bridge: one short sentence (under 25 words) connecting it to Spanish: a real sound rule (‹noche› → «notte»), a false friend, or a gender or construction that differs. Only state etymology you are sure of; when the Spanish word is unrelated, say so and give a memory hook instead. Empty when there is nothing useful.
- parts: the phrase split into chunks a learner can reuse, in order, each with a short English gloss: [{"it":"Dove","en":"where"},{"it":"posso","en":"can I"},{"it":"ricaricare","en":"charge"},{"it":"il telefono","en":"the phone"}]. Keep an article with its noun. Every word of the phrase appears in exactly one chunk, spelled as in the phrase.
- grammar: the one structure in the phrase worth learning (posso + infinitive, ci vuole, the partitive, a reflexive, the passato prossimo with essere…), compared with Spanish when that helps. At most two sentences, under 40 words. Empty for a fixed expression with nothing to learn.
- rule: the id of the course card below that teaches exactly the structure or sound rule this entry shows. A wrong link is worse than none: leave it empty unless the card's rule is plainly at work in this entry.

Write Italian inside «» and Spanish inside ‹› in bridge and grammar, like «posso» and ‹puedo›.

Course cards (id: lesson — card: the rule):
${rules.map((r) => `${r.id}: ${r.lesson.title} — ${r.title}: ${r.gist}`).join("\n")}`;

/** Word or phrase, and what it teaches. Null when the model fails: the entry still works without it. */
export async function describe(p: { it: string; en: string }): Promise<Details | null> {
  try {
    const { output } = await generateText({
      model: MODEL,
      system: DESCRIBE,
      prompt: `Entry: ${p.it}\nMeaning: ${p.en}`,
      output: Output.object({ schema: detailsSchema }),
      // Runs alongside the recording, so it can afford a little thought.
      providerOptions: { gateway: { models: FALLBACK_MODELS }, openai: { reasoningEffort: "low" } },
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(DESCRIBE_LEASE_MS / 2),
    });
    const clean = (s: string) => s.replace(/\s+/g, " ").trim().normalize("NFC");
    const word = output.kind === "word";
    const example = { it: clean(output.example.it), en: clean(output.example.en) };
    return {
      kind: output.kind,
      pos: word ? output.pos : "other",
      forms: word ? output.forms.map(clean).filter(Boolean) : [],
      es: plain(clean(output.es)),
      bridge: clean(output.bridge),
      example: word && example.it ? example : { it: "", en: "" },
      parts: word ? [] : output.parts.map((x) => ({ it: clean(x.it), en: clean(x.en) })).filter((x) => x.it),
      grammar: word ? "" : clean(output.grammar),
      rule: ruleById.has(output.rule.trim()) ? output.rule.trim() : "",
    };
  } catch (e) {
    console.error(`Describing "${p.it}" failed:`, e);
    return null;
  }
}

/** The phrase read in the app's voice, or null with no ElevenLabs key (the device voice plays it). */
async function record(it: string): Promise<string | null> {
  const key = audioKey(it);
  if (builtInClips.has(key)) return `/audio/${key}.mp3`;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !process.env.BLOB_READ_WRITE_TOKEN) return null;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      text: forSpeech(it),
      model_id: MODEL_ID,
      language_code: LANGUAGE_CODE,
      voice_settings: VOICE_SETTINGS,
      seed: SEED,
    }),
  });
  if (!res.ok || !res.headers.get("content-type")?.startsWith("audio/")) {
    // A missing clip is not worth losing the phrase over: the device voice reads it.
    console.error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const audio = Buffer.from(await res.arrayBuffer());
  await put(`phrases/${key}.mp3`, audio, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  // Served same-origin through a rewrite (next.config.ts), so the service worker can save it for offline.
  return `/audio/added/${key}.mp3`;
}

const set = (id: string, values: Partial<typeof addedPhrase.$inferInsert>) =>
  db
    .update(addedPhrase)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(addedPhrase.id, id));

/** Runs after the response is sent; the client polls the row's status. */
export async function generatePhrase(id: string, query: string) {
  try {
    const d = await draft(query);
    await set(id, { status: "recording", ...d });
    const audioUrl = await record(d.it);
    // Ready to say now; what it teaches follows a few seconds later.
    await set(id, { status: "ready", audioUrl, error: null, detailsTriedAt: new Date() });
    await saveDetails(id, d.it, await describe(d));
  } catch (e) {
    console.error(`Adding phrase "${query}" failed:`, e);
    const error = e instanceof UserFacingError ? e.message : "Something went wrong. Try again.";
    await set(id, { status: "failed", error }).catch(() => {});
  }
}

/** Only if it is still the same entry: asking again rewrites the row. */
async function saveDetails(id: string, it: string, details: Details | null) {
  if (!details) return;
  await db
    .update(addedPhrase)
    .set({ details })
    .where(and(eq(addedPhrase.id, id), eq(addedPhrase.status, "ready"), eq(addedPhrase.it, it), isNull(addedPhrase.details)))
    .catch((e) => console.error(e));
}

/**
 * Fills in details for ready phrases added before entries had them, a few per
 * call. Each row is claimed first, so overlapping loads on any instance skip
 * it, and a failure waits out its lease before anyone tries again.
 */
export async function describeMissing(ids: string[]) {
  const claimed = await db
    .update(addedPhrase)
    .set({ detailsTriedAt: new Date() })
    .where(
      and(
        inArray(addedPhrase.id, ids.slice(0, 4)),
        eq(addedPhrase.status, "ready"),
        isNull(addedPhrase.details),
        or(isNull(addedPhrase.detailsTriedAt), lt(addedPhrase.detailsTriedAt, new Date(Date.now() - 60 * DESCRIBE_LEASE_MS))),
      ),
    )
    .returning({ id: addedPhrase.id, it: addedPhrase.it, en: addedPhrase.en });
  await Promise.all(claimed.map(async (r) => r.it && saveDetails(r.id, r.it, await describe({ it: r.it, en: r.en ?? "" }))));
}
