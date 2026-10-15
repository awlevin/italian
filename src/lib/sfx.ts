"use client";

/** Tiny synthesized UI sounds. No assets, ~0ms latency. */
let ctx: AudioContext | null = null;

const MUTE_KEY = "ponte:sfx-muted";
export const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};
export const setMuted = (m: boolean) => {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {}
};

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine") {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ready() {
  if (isMuted() || typeof window === "undefined") return false;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return true;
}

export const sfx = {
  correct() {
    if (!ready()) return;
    tone(784, 0, 0.18, 0.08, "triangle"); // G5
    tone(1175, 0.08, 0.28, 0.07, "triangle"); // D6
  },
  wrong() {
    if (!ready()) return;
    tone(220, 0, 0.22, 0.07, "sine");
    tone(185, 0.07, 0.26, 0.06, "sine");
    navigator.vibrate?.(30);
  },
  /** A pair clicks into place. Each match climbs one step of a major scale. */
  match(n = 0) {
    if (!ready()) return;
    const scale = [659, 740, 831, 880, 988, 1109];
    tone(scale[Math.min(n, scale.length - 1)], 0, 0.16, 0.05, "triangle");
  },
  tap() {
    if (!ready()) return;
    tone(1400, 0, 0.05, 0.025, "sine");
  },
  stamp() {
    if (!ready()) return;
    tone(90, 0, 0.18, 0.18, "square");
    tone(140, 0.01, 0.1, 0.06, "triangle");
  },
  done() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 0.06, "triangle"));
  },
};
