/**
 * The app's one Italian voice, shared by `pnpm audio:gen` (the built-in clips)
 * and the server (clips for phrases added from the phrasebook), so every clip
 * sounds the same.
 */

/**
 * "Violetta - Ringing, Bright and Joyful" from the ElevenLabs voice library.
 * Native Italian, standard accent, clear and warm narration (not dramatic, ASMR
 * or newsreader). Verified for Italian on eleven_v4. It is the most used
 * Italian female voice in the library, so it is well tested.
 */
export const VOICE_ID = "gfKKsLN1k0oYYN9n2dXX";
export const VOICE_OWNER_ID = "136391b37c76c590e5a8337fee0ade3148d010535925031b132ae20221553dc6";
export const VOICE_NAME = "Violetta (Ponte)";

export const MODEL_ID = "eleven_v4";
export const FALLBACK_MODEL_ID = "eleven_multilingual_v2";
export const LANGUAGE_CODE = "it";

/** Steady, plain delivery: a patient teacher, not a performance. */
export const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.75, style: 0, use_speaker_boost: true };
/** Fixed seed so a re-run of the same text sounds the same. */
export const SEED = 20251015;
/** 64 kbps mono: clear speech, about 8 KB per second. Small for roaming data. */
export const OUTPUT_FORMAT = "mp3_44100_64";

/**
 * What the model reads. The audio key still comes from the original text.
 * A slash between alternatives ("sette / sete") becomes a short pause;
 * read as-is, the model says "barra".
 */
export const forSpeech = (text: string) =>
  text.replace(/([.?!…])\s*\/\s*/g, "$1 ").replace(/\s*\/\s*/g, ", ");
