"use client";

import { applyAnswer } from "@/lib/srs";
import { emptySnapshot, type Op, type OpInput, type Snapshot } from "@/lib/sync";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Pure: apply one op to a snapshot. Mirrors the server's semantics. */
export function reduce(s: Snapshot, op: Op): Snapshot {
  switch (op.t) {
    case "answer": {
      const day = today(new Date(op.at));
      return {
        ...s,
        items: { ...s.items, [op.itemId]: applyAnswer(s.items[op.itemId], op.correct, op.at) },
        totals: { answers: s.totals.answers + 1, correct: s.totals.correct + (op.correct ? 1 : 0) },
        days: s.days.includes(day) ? s.days : [day, ...s.days].sort().reverse(),
      };
    }
    case "lesson": {
      const prev = s.lessons[op.lessonId];
      const newer = !prev || prev.updatedAt <= op.at;
      return {
        ...s,
        lessons: {
          ...s.lessons,
          [op.lessonId]: {
            stepIndex: newer ? op.stepIndex : prev.stepIndex,
            completedAt: prev?.completedAt ?? (op.completed ? op.at : null),
            bestAccuracy:
              op.accuracy == null ? (prev?.bestAccuracy ?? null) : Math.max(prev?.bestAccuracy ?? 0, op.accuracy),
            updatedAt: newer ? op.at : prev.updatedAt,
          },
        },
      };
    }
    case "star": {
      const rest = s.starred.filter((id) => id !== op.phraseId);
      return { ...s, starred: op.on ? [op.phraseId, ...rest] : rest };
    }
  }
}

const RETRY_MS = [1_000, 3_000, 8_000, 20_000, 60_000];

/**
 * Local-first progress store.
 * Every change is applied instantly, persisted to localStorage, and queued
 * in an outbox that is flushed to the server with retries. Nothing is lost
 * if the network drops (trains, tunnels, roaming).
 */
export class ProgressStore {
  private snapshot: Snapshot;
  private server: Snapshot | null = null;
  private outbox: Op[];
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight = false;
  private attempt = 0;
  private loadAttempt = 0;
  private loading = false;
  /** True once a server snapshot has been loaded this session. */
  private fresh = false;
  /** Ops the server has confirmed, so another tab's copy of them is not re-queued. */
  private confirmed = new Set<string>();
  /** A sync whose response never came back: the server may have applied it anyway. */
  private ambiguous = false;
  status: SyncStatus = "idle";
  loaded = false;
  /** The server said 401: the sign-in session needs refreshing (e.g. after an offline start). */
  unauthorized = false;

  constructor(private userId: string) {
    this.outbox = this.read<Op[]>("outbox") ?? [];
    const cached = this.read<Snapshot>("snapshot");
    this.server = cached;
    this.snapshot = this.outbox.reduce(reduce, cached ?? emptySnapshot());
    this.loaded = !!cached;
    // A new device on a stalled connection: don't hold the app on an empty snapshot for long.
    if (!this.loaded)
      setTimeout(() => {
        if (this.loaded) return;
        this.loaded = true;
        this.emit();
      }, 3_000);
  }

  // "ponte" is the app's old name. Keep it: a new prefix would orphan unsynced outboxes.
  private key(k: string) {
    return `ponte:${k}:${this.userId}`;
  }
  private read<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(this.key(k));
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }
  private write(k: string, v: unknown) {
    try {
      localStorage.setItem(this.key(k), JSON.stringify(v));
    } catch {
      /* Storage full or blocked: the outbox still lives in memory. */
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  private emit() {
    this.listeners.forEach((l) => l());
  }
  private setStatus(s: SyncStatus) {
    if (this.status === s) return;
    this.status = s;
    this.emit();
  }

  /**
   * Saves the outbox, first taking in ops another tab (say, the home-screen app
   * and a browser tab) queued under the same key, so neither overwrites the other.
   */
  private saveOutbox() {
    const mine = new Set(this.outbox.map((o) => o.id));
    for (const op of this.read<Op[]>("outbox") ?? []) {
      if (mine.has(op.id) || this.confirmed.has(op.id)) continue;
      this.outbox.push(op);
      this.snapshot = reduce(this.snapshot, op);
    }
    this.write("outbox", this.outbox);
  }

  dispatch(input: OpInput) {
    const op = { ...input, id: crypto.randomUUID(), at: new Date().toISOString() } as Op;
    this.outbox.push(op);
    this.saveOutbox();
    this.snapshot = reduce(this.snapshot, op);
    this.emit();
    this.schedule(400);
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  /**
   * Pulls the server snapshot and replays unsent ops on top.
   * Flushes wait while a load is in flight, so a confirmed op can never be
   * dropped by an older server response arriving after it.
   */
  async load() {
    if (this.loading) return;
    if (this.inflight) {
      setTimeout(() => void this.load(), 300);
      return;
    }
    this.loading = true;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Spotty signal can hang a request forever, and flushes wait on loads: give up and retry instead.
      const res = await fetch(`/api/progress?tz=${encodeURIComponent(tz)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      this.unauthorized = res.status === 401;
      if (!res.ok) throw new Error(String(res.status));
      this.server = (await res.json()) as Snapshot;
      this.write("snapshot", this.server);
      this.snapshot = this.outbox.reduce(reduce, this.server);
      this.fresh = true;
      this.loadAttempt = 0;
      if (!this.outbox.length) this.setStatus("idle");
    } catch {
      this.setStatus(navigator.onLine ? "error" : "offline");
      const delay = RETRY_MS[Math.min(this.loadAttempt++, RETRY_MS.length - 1)];
      setTimeout(() => void this.load(), delay);
    } finally {
      this.loading = false;
      this.loaded = true;
      this.emit();
    }
    if (this.outbox.length) void this.flush();
  }

  /** Called when the network comes back. */
  reconnect() {
    if (!this.fresh) void this.load();
    else void this.flush();
  }

  async flush({ keepalive = false } = {}) {
    if (this.inflight || this.loading || !this.outbox.length) return;
    if (!navigator.onLine) return this.setStatus("offline");
    this.inflight = true;
    this.setStatus("saving");
    const batch = this.outbox.slice(0, 200);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: batch }),
        keepalive,
        signal: AbortSignal.timeout(20_000),
      });
      this.unauthorized = res.status === 401;
      if (!res.ok) throw new Error(String(res.status));
      const sent = new Set(batch.map((o) => o.id));
      sent.forEach((id) => this.confirmed.add(id));
      this.outbox = this.outbox.filter((o) => !sent.has(o.id));
      this.saveOutbox();
      // Fold confirmed ops into the cached server snapshot.
      this.server = batch.reduce(reduce, this.server ?? emptySnapshot());
      this.write("snapshot", this.server);
      this.attempt = 0;
      this.inflight = false;
      this.setStatus(this.outbox.length ? "saving" : "saved");
      if (this.outbox.length) void this.flush();
      else if (this.ambiguous) {
        // An earlier sync may have landed before its response was lost, so the
        // local view could count it twice: take the server's word for it.
        this.ambiguous = false;
        void this.load();
      }
    } catch (e) {
      // A timeout or dropped connection: the server may still have applied the batch.
      if (!(e instanceof Error && /^\d{3}$/.test(e.message))) this.ambiguous = true;
      this.inflight = false;
      this.setStatus(navigator.onLine ? "error" : "offline");
      this.schedule(RETRY_MS[Math.min(this.attempt++, RETRY_MS.length - 1)]);
    }
  }

  get pending() {
    return this.outbox.length;
  }
}
