/**
 * Fails when course audio is out of date: a speakable string has no clip or
 * no manifest entry, or the manifest / public/audio hold stale entries.
 * Fix with `pnpm audio:gen`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectAudioStrings } from "./audio-strings";

const ROOT = resolve(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public/audio");
const manifest = JSON.parse(readFileSync(join(ROOT, "src/content/audio-manifest.json"), "utf8")) as { keys: string[] };

const all = collectAudioStrings();
const wanted = new Set(all.map((s) => s.key));
const listed = new Set(manifest.keys);
const files = existsSync(AUDIO_DIR) ? readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")) : [];

const problems = [
  ...all.filter((s) => !listed.has(s.key)).map((s) => `not in manifest: "${s.text}" (${s.source})`),
  ...all.filter((s) => !existsSync(join(AUDIO_DIR, `${s.key}.mp3`))).map((s) => `no clip: "${s.text}" (${s.source})`),
  ...manifest.keys.filter((k) => !wanted.has(k)).map((k) => `stale manifest key: ${k}`),
  ...files.filter((f) => !wanted.has(f.slice(0, -4))).map((f) => `orphaned clip: public/audio/${f}`),
];

if (problems.length) {
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
  if (problems.length > 50) console.error(`  …and ${problems.length - 50} more`);
  console.error(`\nAudio is out of date (${problems.length} problem(s)). Run: pnpm audio:gen`);
  process.exit(1);
}
console.log(`Audio OK: ${all.length} strings, all with clips and manifest entries.`);
