import "server-only";
import { put } from "@vercel/blob";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import manifest from "@/content/audio-manifest.json";
import { db } from "@/db";
import { addedPhrase } from "@/db/schema";
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

The request may be in English, Spanish or Italian, and may be a whole sentence, a few keywords or a situation ("ask for the wifi password"). Write the one Italian phrase they most likely want to say.

Rules:
- it: natural, polite spoken Italian, as you would say it to a stranger, a waiter or a clerk (Lei form). Sentence case, standard punctuation, correct accents. Keep it short.
- en: a short English meaning in sentence case, like "Where's the bathroom?". Use " / " for a second meaning.
- say: pronunciation for an English reader, stressed syllables in CAPS, words separated by spaces, syllables by hyphens.
- note: at most one short sentence of practical advice (when to use it, what you'll hear back, a cultural catch). Leave it empty unless it helps.
- Fix spelling mistakes in the request. If the request is already Italian, correct it if needed and use it.
- ok is false only for gibberish, or for something no one would say.

Examples of entries:
{"it":"Il conto, per favore","en":"The bill, please","say":"eel KOHN-toh, pehr fah-VOH-reh","note":"It won't come until you ask. A per-person 'coperto' on it is normal."}
{"it":"Dov'è il bagno?","en":"Where's the bathroom?","say":"doh-VEH eel BAHN-yoh","note":"In a bar, buy something first; it's only fair."}
{"it":"Contiene glutine?","en":"Does it contain gluten?","say":"kohn-TYEH-neh GLOO-tee-neh","note":"Look for 'senza glutine' on menus; Italy is good at it."}
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
    await set(id, { status: "ready", audioUrl, error: null });
  } catch (e) {
    console.error(`Adding phrase "${query}" failed:`, e);
    const error = e instanceof UserFacingError ? e.message : "Something went wrong. Try again.";
    await set(id, { status: "failed", error }).catch(() => {});
  }
}
