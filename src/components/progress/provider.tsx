"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, use, useEffect, useMemo, useSyncExternalStore } from "react";
import { emptySnapshot, type OpInput, type Snapshot } from "@/lib/sync";
import { ProgressStore, type SyncStatus } from "./store";

const StoreContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const store = useMemo(() => (isLoaded && userId ? new ProgressStore(userId) : null), [isLoaded, userId]);

  useEffect(() => {
    if (!store) return;
    const s = store;
    void s.load();

    const flush = () => void s.flush();
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") void s.flush({ keepalive: true });
    };
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, [store]);

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
