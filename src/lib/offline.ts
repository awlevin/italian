"use client";

import { useSyncExternalStore } from "react";
import manifest from "@/content/audio-manifest.json";
import { allLessons } from "@/content/course";

// Cache names are shared with public/sw.js.
const PAGES = "ciao-pages-v1";
const STATIC = "ciao-static-v1";
const AUDIO = "ciao-audio-v1";

const SHELL_KEY = "ciao:offline-shell";
const WANT_KEY = "ciao:offline-audio";
const USER_KEY = "ciao:last-user";

export const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

export function registerServiceWorker() {
  if (!supported() || process.env.NODE_ENV !== "production") return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

// --- Connectivity -----------------------------------------------------------

const subscribeOnline = (fn: () => void) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
};

/** False when the device reports no network. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// --- Last signed-in user ----------------------------------------------------
// Clerk needs the network to start. Offline, the app falls back to the last
// user who signed in on this device, whose progress is already stored locally.

export function rememberUser(id: string | null) {
  try {
    if (id) localStorage.setItem(USER_KEY, id);
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function lastUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

// --- Downloading --------------------------------------------------------------

export const pagePaths = () => ["/", "/review", "/phrasebook", ...allLessons.map((l) => `/lesson/${l.id}`)];
const audioUrls = () => manifest.keys.map((k) => `/audio/${k}.mp3`);

const ASSET_RE = /\/_next\/static\/[^"'\s()\\<>]+/g;
const CSS_URL_RE = /url\(\s*["']?(\/_next\/static\/[^"')\s]+)["']?\s*\)/g;

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

async function put(cache: Cache, url: string, key = url): Promise<Response | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-cache" });
    if (!res.ok || res.redirected) return null;
    await cache.put(new URL(key, location.origin).href, res.clone());
    return res;
  } catch {
    return null;
  }
}

/**
 * Saves every page and the scripts, styles and fonts they use. A page is only
 * saved once all of its assets are, so an offline load can never find a page
 * whose scripts are missing.
 */
async function savePages(onStep?: () => void) {
  const [pages, stat] = await Promise.all([caches.open(PAGES), caches.open(STATIC)]);
  const fonts = new Set<string>();
  await pool(pagePaths(), 4, async (path) => {
    try {
      const res = await fetch(path, { credentials: "same-origin", cache: "no-cache" });
      if (!res.ok || res.redirected) return;
      const html = await res.clone().text();
      const assets = [...new Set(html.match(ASSET_RE) ?? [])];
      const saved = await Promise.all(
        assets.map(async (url) => {
          if (await stat.match(url)) return true;
          const asset = await put(stat, url);
          if (asset && url.endsWith(".css")) for (const m of (await asset.text()).matchAll(CSS_URL_RE)) fonts.add(m[1]);
          return !!asset;
        }),
      );
      if (saved.every(Boolean)) await pages.put(new URL(path, location.origin).href, res);
    } catch {
      // Keep whatever copy of this page was saved before.
    } finally {
      onStep?.();
    }
  });
  await pool([...fonts], 6, async (url) => void ((await stat.match(url)) || (await put(stat, url))));
}

/** The home page's script list: it changes with every deploy. */
async function buildSignature(): Promise<string | null> {
  try {
    const res = await fetch("/", { credentials: "same-origin", cache: "no-cache" });
    return res.ok ? [...new Set((await res.text()).match(ASSET_RE) ?? [])].sort().join("|") : null;
  } catch {
    return null;
  }
}

async function missingAudio(): Promise<string[]> {
  const cache = await caches.open(AUDIO);
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  return audioUrls().filter((u) => !have.has(u));
}

// --- Store --------------------------------------------------------------------

export type OfflineState =
  | { phase: "unsupported" }
  | { phase: "checking" }
  | { phase: "idle"; audioMissing: number }
  | { phase: "downloading"; done: number; total: number }
  | { phase: "ready" }
  | { phase: "error"; audioMissing: number };

let state: OfflineState = { phase: "checking" };
const listeners = new Set<() => void>();
const set = (s: OfflineState) => {
  state = s;
  listeners.forEach((l) => l());
};

function readKey(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeKey(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

let started = false;

/**
 * Runs once per app load: keeps the page shell cached for the current build,
 * resumes an interrupted download, and reports how much audio is saved.
 */
export async function initOffline() {
  if (started) return;
  started = true;
  if (!supported() || process.env.NODE_ENV !== "production") return set({ phase: "unsupported" });
  void navigator.storage?.persist?.().catch(() => {});

  // Re-save the pages after each deploy, so offline loads match the cached scripts.
  const sig = navigator.onLine ? await buildSignature() : null;
  if (sig && sig !== readKey(SHELL_KEY)) {
    await savePages().catch(() => {});
    writeKey(SHELL_KEY, sig);
  }
  const missing = await missingAudio().catch(() => audioUrls());
  if (!missing.length) return set({ phase: "ready" });
  if (readKey(WANT_KEY) && navigator.onLine) return download();
  set({ phase: "idle", audioMissing: missing.length });
}

/** Saves everything needed to use the app offline. */
export async function download() {
  if (state.phase === "downloading" || !supported()) return;
  writeKey(WANT_KEY, "1");
  void navigator.storage?.persist?.().catch(() => {});
  const pages = pagePaths().length;
  const missing = await missingAudio().catch(() => audioUrls());
  const total = pages + missing.length;
  let done = 0;
  const tick = () => set({ phase: "downloading", done: ++done, total });
  set({ phase: "downloading", done, total });

  await savePages(tick).catch(() => {});
  const cache = await caches.open(AUDIO);
  await pool(missing, 6, async (url) => {
    await put(cache, url);
    tick();
  });

  const left = await missingAudio().catch(() => missing);
  set(left.length ? { phase: "error", audioMissing: left.length } : { phase: "ready" });
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
const server: OfflineState = { phase: "checking" };

export function useOfflineState(): OfflineState {
  return useSyncExternalStore(subscribe, () => state, () => server);
}
