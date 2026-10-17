"use client";

import { createContext, use, useEffect, useMemo, useSyncExternalStore } from "react";
import { initOffline, registerServiceWorker, rememberUser } from "@/lib/offline";
import { emptySnapshot, type OpInput, type Snapshot } from "@/lib/sync";
import { useUserId } from "../auth-gate";
import { ProgressStore, type SyncStatus } from "./store";

const StoreContext = createContext<ProgressStore | null>(null);
const AUTH_RELOAD_KEY = "ciao:auth-reload";

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { ready, userId, offline, clerkSignedOut } = useUserId();
  const store = useMemo(() => (ready && userId ? new ProgressStore(userId) : null), [ready, userId]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Keep the app saved for offline use once someone is signed in.
  useEffect(() => {
    if (userId) void initOffline();
  }, [userId]);

  useEffect(() => {
    if (!store) return;
    const s = store;
    void s.load();

    const reconnect = () => s.reconnect();
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") void s.flush({ keepalive: true });
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, [store]);

  // Running as the last user without Clerk's say-so. Once the server answers 401:
  // if Clerk says signed out, believe it (the server is reachable, so this is a
  // real sign-out). If Clerk never loaded (started offline), its session token
  // can't refresh: a reload brings it up. Only from a tab screen, never in the
  // middle of a lesson or review.
  useEffect(() => {
    if (!store || !offline) return;
    const check = () => {
      if (!store.unauthorized) return;
      if (clerkSignedOut) return rememberUser(null);
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      if (location.pathname.startsWith("/lesson/") || new URLSearchParams(location.search).has("s")) return;
      try {
        if (Date.now() - Number(sessionStorage.getItem(AUTH_RELOAD_KEY) ?? 0) < 120_000) return;
        sessionStorage.setItem(AUTH_RELOAD_KEY, String(Date.now()));
      } catch {
        return;
      }
      location.reload();
    };
    const id = setInterval(check, 5_000);
    const unsubscribe = store.subscribe(check);
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [store, offline, clerkSignedOut]);

  return <StoreContext value={store}>{children}</StoreContext>;
}

const empty = emptySnapshot();
const noop = () => () => {};

/** The current snapshot; empty while signed out or loading. */
export function useProgress(): Snapshot {
  const store = use(StoreContext);
  return useSyncExternalStore(
    store?.subscribe ?? noop,
    store?.getSnapshot ?? (() => empty),
    () => empty,
  );
}

export function useProgressReady(): boolean {
  const store = use(StoreContext);
  return useSyncExternalStore(
    store?.subscribe ?? noop,
    () => !!store?.loaded,
    () => false,
  );
}

export function useSyncStatus(): SyncStatus {
  const store = use(StoreContext);
  return useSyncExternalStore(
    store?.subscribe ?? noop,
    () => store?.status ?? "idle",
    () => "idle" as const,
  );
}

export function useDispatch() {
  const store = use(StoreContext);
  return (op: OpInput) => store?.dispatch(op);
}
