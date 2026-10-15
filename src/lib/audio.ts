"use client";

import manifest from "@/content/audio-manifest.json";
import { audioKey, plain } from "./text";

const available = new Set<string>(manifest.keys);
let current: HTMLAudioElement | null = null;
const listeners = new Set<(playing: string | null) => void>();
let playingText: string | null = null;

function setPlaying(text: string | null) {
  playingText = text;
  listeners.forEach((l) => l(text));
}

export function onPlaying(fn: (playing: string | null) => void) {
  listeners.add(fn);
  fn(playingText);
  return () => void listeners.delete(fn);
}

let italianVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (italianVoice !== undefined) return italianVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const it = voices.filter((v) => v.lang.toLowerCase().startsWith("it"));
  italianVoice =
    it.find((v) => /premium|enhanced|natural/i.test(v.name)) ??
    it.find((v) => /alice|federica|luca|elsa/i.test(v.name)) ??
    it[0] ??
    null;
  return italianVoice;
}

function speakSynth(text: string, rate: number) {
  const synth = window.speechSynthesis;
  if (!synth) return setPlaying(null);
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "it-IT";
  u.rate = 0.95 * rate;
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.onend = u.onerror = () => setPlaying(null);
  synth.speak(u);
}

export function stop() {
  current?.pause();
  current = null;
  window.speechSynthesis?.cancel();
  setPlaying(null);
}

/** Plays Italian text. Uses pre-generated audio when present, else the device voice. */
export function speak(raw: string, { rate = 1 }: { rate?: number } = {}) {
  const text = plain(raw);
  if (!text) return;
  stop();
  setPlaying(raw);
  const key = audioKey(text);
  if (available.has(key)) {
    const el = new Audio(`/audio/${key}.mp3`);
    el.playbackRate = rate;
    // Keep pitch natural when slowed down.
    (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    current = el;
    el.onended = () => current === el && setPlaying(null);
    el.onerror = () => current === el && speakSynth(text, rate);
    el.play().catch(() => current === el && speakSynth(text, rate));
  } else {
    speakSynth(text, rate);
  }
}

/** Warm the cache for clips the user is about to hear. */
const preloaded = new Set<string>();
export function preload(texts: string[]) {
  for (const t of texts) {
    const key = audioKey(t);
    if (available.has(key) && !preloaded.has(key)) {
      preloaded.add(key);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "audio";
      link.href = `/audio/${key}.mp3`;
      document.head.appendChild(link);
    }
  }
}
