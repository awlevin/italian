"use client";

import { useEffect, useSyncExternalStore } from "react";
import { type AddedPhrase, isPending } from "@/lib/added-phrases";
import { addClips } from "@/lib/audio";

/**
 * Phrases added from the phrasebook's search, shared by everyone. Saved on the
 * device for offline, refreshed when the phrasebook opens, and polled while one
 * is still being written or recorded.
 */

const CACHE_KEY = "ciao:added-phrases";
const POLL_MS = 1500;
/** A stalled connection (train or plane Wi-Fi) must never stop the polling. */
const FETCH_TIMEOUT_MS = 8000;
const EMPTY: AddedPhrase[] = [];

let list: AddedPhrase[] | null = null;
const listeners = new Set<() => void>();

function set(next: AddedPhrase[]) {
  list = next;
  addClips(next.flatMap((p) => (p.status === "ready" && p.audioUrl ? [{ text: p.it, url: p.audioUrl }] : [])));
  try {
    // Ready ones only, so the phrasebook has them offline.
    localStorage.setItem(CACHE_KEY, JSON.stringify(next.filter((p) => p.status === "ready")));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  if (list === null) {
    try {
      set(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as AddedPhrase[]);
    } catch {
      list = [];
    }
  }
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

let poll: ReturnType<typeof setTimeout> | undefined;

async function load() {
  clearTimeout(poll);
  try {
    const res = await fetch("/api/phrases", { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) set(((await res.json()) as { phrases: AddedPhrase[] }).phrases);
  } catch {} // Offline or timed out: keep what is saved, and try again below.
  if (listeners.size && list?.some((p) => isPending(p) || p.describing)) poll = setTimeout(() => void load(), POLL_MS);
}

export class AddError extends Error {}

/** Asks for a phrase. Throws AddError("offline"), AddError("failed") or one with the server's message. */
async function add(query: string) {
  let res: Response;
  try {
    res = await fetch("/api/phrases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2),
    });
  } catch {
    throw new AddError("offline");
  }
  const body = (await res.json().catch(() => ({}))) as { phrase?: AddedPhrase; message?: string };
  if (!res.ok || !body.phrase) throw new AddError(body.message ?? "failed");
  const phrase = body.phrase;
  set([phrase, ...(list ?? []).filter((p) => p.id !== phrase.id)]);
  if (isPending(phrase) || phrase.describing) void load();
}

/** Takes a phrase out for everyone. */
async function remove(id: string) {
  set((list ?? []).filter((p) => p.id !== id));
  await fetch(`/api/phrases/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}

export function useAddedPhrases() {
  const phrases = useSyncExternalStore(subscribe, () => list ?? EMPTY, () => EMPTY);

  useEffect(() => {
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(poll);
    };
  }, []);

  return { phrases, add, remove };
}
