/*
 * Ciao service worker: makes the app open and run with no network.
 *
 * - Pages: the saved copy opens instantly and is refreshed in the background; unsaved pages
 *   come from the network, with a short timeout for flaky train Wi-Fi.
 * - Build assets and audio: cache first; their URLs never change content.
 * - Clerk's script: stale-while-revalidate, so the sign-in library loads offline too.
 * - API calls are left alone; the progress store queues them while offline.
 *
 * Cache names are shared with src/lib/offline.ts, which fills them on "Download for offline".
 */

const PAGES = "ciao-pages-v1";
const STATIC = "ciao-static-v1";
const AUDIO = "ciao-audio-v1";
const VENDOR = "ciao-vendor-v1";
const KEEP = [PAGES, STATIC, AUDIO, VENDOR];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(["/"]))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("ciao-") && !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Only plain successful responses are worth keeping (no redirects, e.g. Clerk's handshake). */
const cacheable = (res) => res && res.ok && !res.redirected && (res.type === "basic" || res.type === "cors");

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

/** Pages are keyed by path alone, so `/lesson/x?foo` still finds `/lesson/x`. */
const pageKey = (url) => new URL(url).origin + new URL(url).pathname;

async function navigate(event) {
  const cache = await caches.open(PAGES);
  const key = pageKey(event.request.url);
  const network = fetch(event.request);
  const refresh = network.then((res) => (cacheable(res) ? cache.put(key, res.clone()) : undefined)).catch(() => {});

  // Saved pages open instantly, whatever the signal; the network refreshes them for next time.
  const saved = await cache.match(key);
  if (saved) {
    event.waitUntil(refresh);
    return saved;
  }
  try {
    const res = await withTimeout(network, NAV_TIMEOUT_MS);
    event.waitUntil(refresh);
    return res;
  } catch {
    const home = await cache.match(new URL("/", event.request.url).href);
    if (home) {
      event.waitUntil(refresh);
      return home;
    }
    return network.catch(() => offlinePage());
  }
}

function offlinePage() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ciao · Offline</title>
<body style="font:16px system-ui;display:grid;place-items:center;min-height:100dvh;margin:0;background:#eceef3;color:#1a1f36;text-align:center;padding:24px">
<div><p style="font:italic 30px Georgia,serif;margin:0 0 8px">Ciao</p>
<p style="margin:0 0 16px">You are offline and this page was not downloaded yet.</p>
<a href="/" style="color:inherit;font-weight:600">Back to lessons</a></div>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) await cache.put(request, res.clone());
  return res;
}

/**
 * Audio is cached whole. Safari's media element asks for byte ranges, so
 * answer those by slicing the cached clip.
 */
async function audio(request) {
  const full = await cacheFirst(new Request(request.url), AUDIO);
  const range = request.headers.get("range");
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (!m || !full.ok) return full;
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("Content-Type") ?? "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function staleWhileRevalidate(event, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(event.request);
  const network = fetch(event.request).then((res) => {
    if (cacheable(res)) return cache.put(event.request, res.clone()).then(() => res);
    return res;
  });
  if (hit) {
    event.waitUntil(network.catch(() => {}));
    return hit;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") return event.respondWith(navigate(event));
    if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request, STATIC));
    if (url.pathname.startsWith("/audio/")) return event.respondWith(audio(request));
    if (/^\/(icon|apple-icon|favicon|manifest)/.test(url.pathname)) return event.respondWith(staleWhileRevalidate(event, STATIC));
    return;
  }

  // Clerk's browser bundle, served from its Frontend API under /npm/.
  if (url.pathname.includes("/npm/@clerk/")) return event.respondWith(staleWhileRevalidate(event, VENDOR));
});
