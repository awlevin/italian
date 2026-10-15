/**
 * Pre-generates native Italian audio for every string the app can speak.
 *
 *   pnpm audio:gen               generate missing clips, prune orphans, write the manifest
 *   pnpm audio:gen --dry-run     list counts and characters only, no API calls
 *   pnpm audio:gen --test [dir]  generate a fixed set of tricky clips into dir (default: OS temp)
 *
 * Clips land in public/audio/<audioKey>.mp3. The client plays a clip only when
 * its key is in src/content/audio-manifest.json, else it falls back to the
 * device voice. Existing clips are kept: to re-voice everything (new voice,
 * model or settings), delete public/audio/*.mp3 and run again.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { audioKey, plain } from "../src/lib/text";
import { collectAudioStrings } from "./audio-strings";

// ── Voice and model ──────────────────────────────────────────────────────────
/**
 * "Violetta - Ringing, Bright and Joyful" from the ElevenLabs voice library.
 * Native Italian, standard accent, clear and warm narration (not dramatic, ASMR
 * or newsreader). Verified for Italian on eleven_v4. It is the most used
 * Italian female voice in the library, so it is well tested.
 */
const VOICE_ID = "gfKKsLN1k0oYYN9n2dXX";
const VOICE_OWNER_ID = "136391b37c76c590e5a8337fee0ade3148d010535925031b132ae20221553dc6";
const VOICE_NAME = "Violetta (Ponte)";

const MODEL_ID = "eleven_v4";
const FALLBACK_MODEL_ID = "eleven_multilingual_v2";
const LANGUAGE_CODE = "it";

/** Steady, plain delivery: a patient teacher, not a performance. */
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.75, style: 0, use_speaker_boost: true };
/** Fixed seed so a re-run of the same text sounds the same. */
const SEED = 20251015;
/** 64 kbps mono: clear speech, about 8 KB per second. Small for roaming data. */
const OUTPUT_FORMAT = "mp3_44100_64";
/** The account allows 3 concurrent requests; 429s are retried with backoff. */
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 6;

const TEST_STRINGS = [
  "palla",
  "pala",
  "nonno",
  "gli gnocchi",
  "Buongiorno",
  "Vorrei un caffè, per favore",
  "perché",
  "città",
];

/**
 * What the model reads. The audio key still comes from the original text.
 * A slash between alternatives ("sette / sete") becomes a short pause;
 * read as-is, the model says "barra".
 */
const forSpeech = (text: string) =>
  text.replace(/([.?!…])\s*\/\s*/g, "$1 ").replace(/\s*\/\s*/g, ", ");

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = resolve(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public/audio");
const MANIFEST = join(ROOT, "src/content/audio-manifest.json");
const API = "https://api.elevenlabs.io";

config({ path: join(ROOT, ".env"), quiet: true });
const API_KEY = process.env.ELEVENLABS_API_KEY;

class FatalError extends Error {}

async function api(path: string, init: RequestInit = {}) {
  if (!API_KEY) throw new FatalError("ELEVENLABS_API_KEY is not set (expected in .env).");
  return fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": API_KEY, "content-type": "application/json", ...init.headers },
  });
}

async function errorDetail(res: Response) {
  const body = await res.text();
  try {
    const d = JSON.parse(body).detail;
    return { status: (d?.status ?? d?.code ?? "") as string, message: (d?.message ?? body) as string };
  } catch {
    return { status: "", message: body.slice(0, 300) };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Synthesis ────────────────────────────────────────────────────────────────
interface Model {
  id: string;
  languageCode?: string;
}

async function synthesize(text: string, model: Model): Promise<{ audio: Buffer; cost: number }> {
  const body = JSON.stringify({
    text: forSpeech(text),
    model_id: model.id,
    ...(model.languageCode && { language_code: model.languageCode }),
    voice_settings: VOICE_SETTINGS,
    seed: SEED,
  });
  for (let attempt = 1; ; attempt++) {
    const res = await api(`/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`, { method: "POST", body });
    if (res.ok) {
      const audio = Buffer.from(await res.arrayBuffer());
      if (!res.headers.get("content-type")?.startsWith("audio/") || audio.length < 512)
        throw new Error(`unexpected response (${res.headers.get("content-type")}, ${audio.length} bytes)`);
      return { audio, cost: Number(res.headers.get("character-cost") ?? text.length) };
    }
    const { status, message } = await errorDetail(res);
    if (status === "quota_exceeded" || res.status === 401) throw new FatalError(`${res.status} ${status}: ${message}`);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new Error(`${res.status} ${status}: ${message}`);
    const after = Number(res.headers.get("retry-after"));
    const wait = after > 0 ? after * 1000 : Math.min(30_000, 1000 * 2 ** (attempt - 1)) + Math.random() * 500;
    await sleep(wait);
  }
}

/** Confirms the model exists and speaks Italian. Falls back when it does not. */
async function resolveModel(): Promise<Model> {
  const res = await api("/v1/models");
  if (res.ok) {
    const models = (await res.json()) as { model_id: string; can_do_text_to_speech?: boolean; languages?: { language_id: string }[] }[];
    for (const id of [MODEL_ID, FALLBACK_MODEL_ID]) {
      const m = models.find((x) => x.model_id === id && x.can_do_text_to_speech !== false);
      if (!m) {
        console.warn(`Model ${id} is not available on this account.`);
        continue;
      }
      const speaksItalian = m.languages?.some((l) => l.language_id === LANGUAGE_CODE);
      return { id, languageCode: speaksItalian ? LANGUAGE_CODE : undefined };
    }
    throw new FatalError("Neither model is available.");
  }
  // Restricted keys may lack models_read. Probe with a two-character request instead.
  const { status } = await errorDetail(res);
  console.log(`  (GET /v1/models not permitted: ${status || res.status}; probing with a tiny request)`);
  for (const id of [MODEL_ID, FALLBACK_MODEL_ID]) {
    for (const languageCode of [LANGUAGE_CODE, undefined]) {
      try {
        await synthesize("Sì", { id, languageCode });
        return { id, languageCode };
      } catch (e) {
        if (e instanceof FatalError) throw e;
        console.warn(`  ${id}${languageCode ? ` + language_code=${languageCode}` : ""}: ${(e as Error).message}`);
      }
    }
  }
  throw new FatalError("Neither model is available.");
}

/** Adds the library voice to the account when it is not there yet. */
async function ensureVoice() {
  const res = await api(`/v1/voices/${VOICE_ID}`);
  if (res.ok) {
    const v = (await res.json()) as { name: string };
    console.log(`  voice   ${v.name} (${VOICE_ID})`);
    return;
  }
  const add = await api(`/v1/voices/add/${VOICE_OWNER_ID}/${VOICE_ID}`, {
    method: "POST",
    body: JSON.stringify({ new_name: VOICE_NAME }),
  });
  if (!add.ok) {
    const { status, message } = await errorDetail(add);
    throw new FatalError(`Could not add voice ${VOICE_ID}: ${add.status} ${status}: ${message}`);
  }
  console.log(`  voice   added ${VOICE_NAME} (${VOICE_ID}) from the library`);
}

/** Remaining character quota, or null when the key may not read it. */
async function remainingQuota(): Promise<number | null> {
  const res = await api("/v1/user/subscription");
  if (!res.ok) return null;
  const s = (await res.json()) as { character_count: number; character_limit: number };
  return s.character_limit - s.character_count;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const clipPath = (dir: string, key: string) => join(dir, `${key}.mp3`);

function duration(file: string): number | null {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    return Number(out.toString().trim());
  } catch {
    return null;
  }
}

async function pool<T>(items: T[], limit: number, run: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await run(items[i], i);
      }
    }),
  );
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

// ── Commands ─────────────────────────────────────────────────────────────────
async function runTest(dir: string) {
  mkdirSync(dir, { recursive: true });
  await ensureVoice();
  const model = await resolveModel();
  console.log(`  model   ${model.id}${model.languageCode ? ` (language_code=${model.languageCode})` : ""}\n`);
  let cost = 0;
  for (const raw of TEST_STRINGS) {
    const text = plain(raw).normalize("NFC");
    const file = clipPath(dir, audioKey(text));
    const r = await synthesize(text, model);
    cost += r.cost;
    writeFileSync(file, r.audio);
    const d = duration(file);
    console.log(`  ${text.padEnd(30)} ${kb(r.audio.length).padStart(8)}  ${d === null ? "?" : `${d.toFixed(2)} s`}  ${file}`);
  }
  console.log(`\nBilled characters: ${cost}`);
}

async function runAll(dryRun: boolean) {
  const all = collectAudioStrings();
  const chars = all.reduce((n, s) => n + s.text.length, 0);
  mkdirSync(AUDIO_DIR, { recursive: true });
  const pending = all.filter((s) => !existsSync(clipPath(AUDIO_DIR, s.key)));
  const pendingChars = pending.reduce((n, s) => n + s.text.length, 0);
  console.log(`Strings: ${all.length} (${chars} characters). Missing: ${pending.length} (${pendingChars} characters).`);
  if (dryRun) return;

  const failed: { text: string; source: string; error: string }[] = [];
  let generated = 0;
  let billed = 0;

  if (pending.length) {
    const quota = await remainingQuota();
    if (quota === null) console.log("  quota   unknown (key may not read the subscription); continuing");
    else {
      console.log(`  quota   ${quota} characters remaining`);
      if (pendingChars > quota) throw new FatalError(`Need ${pendingChars} characters but only ${quota} remain. Nothing generated.`);
    }
    await ensureVoice();
    const model = await resolveModel();
    console.log(`  model   ${model.id}${model.languageCode ? ` (language_code=${model.languageCode})` : ""}\n`);

    const halt: { error: Error | null } = { error: null };
    await pool(pending, CONCURRENCY, async (s) => {
      if (halt.error) return;
      try {
        const { audio, cost } = await synthesize(s.text, model);
        const file = clipPath(AUDIO_DIR, s.key);
        writeFileSync(`${file}.tmp`, audio);
        renameSync(`${file}.tmp`, file); // never leave a half-written clip under its real name
        generated++;
        billed += cost;
        const done = generated + failed.length;
        if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${pending.length}`);
        else if (done % 100 === 0 || done === pending.length) console.log(`  ${done}/${pending.length}`);
      } catch (e) {
        if (e instanceof FatalError) halt.error = e;
        failed.push({ text: s.text, source: s.source, error: (e as Error).message });
      }
    });
    if (process.stdout.isTTY) process.stdout.write("\n");
    if (halt.error) console.error(`Stopped early: ${halt.error.message}`);
  }

  // Prune clips that no string uses any more, and stray temp files.
  const wanted = new Set(all.map((s) => s.key));
  let removed = 0;
  for (const f of readdirSync(AUDIO_DIR)) {
    const orphan = f.endsWith(".mp3") ? !wanted.has(f.slice(0, -4)) : f.endsWith(".tmp");
    if (orphan) {
      rmSync(join(AUDIO_DIR, f));
      removed++;
    }
  }

  const keys = all.map((s) => s.key).filter((k) => existsSync(clipPath(AUDIO_DIR, k))).sort();
  writeFileSync(MANIFEST, `${JSON.stringify({ keys }, null, 2)}\n`);

  const bytes = keys.reduce((n, k) => n + statSync(clipPath(AUDIO_DIR, k)).size, 0);
  console.log(
    [
      "",
      `Strings     ${all.length}`,
      `Characters  ${chars} (billed this run: ${billed})`,
      `Generated   ${generated}`,
      `Skipped     ${all.length - pending.length} (already on disk)`,
      `Failed      ${failed.length}`,
      `Removed     ${removed} orphaned file(s)`,
      `Manifest    ${keys.length} keys, ${(bytes / 1024 / 1024).toFixed(2)} MB in public/audio`,
    ].join("\n"),
  );
  for (const f of failed) console.error(`  FAILED  "${f.text}" (${f.source}): ${f.error}`);
  if (failed.length) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const t = args.indexOf("--test");
  if (t !== -1) {
    const dir = args[t + 1] && !args[t + 1].startsWith("--") ? resolve(args[t + 1]) : join(tmpdir(), "ponte-audio-test");
    return runTest(dir);
  }
  return runAll(args.includes("--dry-run"));
}

main().catch((e) => {
  console.error(e instanceof FatalError ? `Error: ${e.message}` : e);
  process.exit(1);
});
