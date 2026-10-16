"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useSyncExternalStore } from "react";
import { lastUser, rememberUser, useOnline } from "@/lib/offline";
import { Welcome } from "./welcome";

/** How long to wait for Clerk before trusting the last user on this device. */
const CLERK_GRACE_MS = 4000;
const noSubscribe = () => () => {};

/**
 * The signed-in user. Clerk needs the network to start, so offline (or on
 * Wi-Fi that goes nowhere) this falls back to the last user who signed in on
 * this device. Their progress is already on the phone.
 */
export function useUserId(): { ready: boolean; userId: string | null; offline: boolean } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const online = useOnline();
  const cached = useSyncExternalStore(noSubscribe, lastUser, () => null);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), CLERK_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // A signed-out answer only counts with a network: offline, Clerk can't know.
    if (isSignedIn) rememberUser(userId);
    else if (online) rememberUser(null);
  }, [isLoaded, isSignedIn, userId, online]);

  if (isLoaded && isSignedIn) return { ready: true, userId, offline: false };
  if (cached && (!online || (!isLoaded && waited))) return { ready: true, userId: cached, offline: true };
  if (!isLoaded) return { ready: false, userId: null, offline: false };
  return { ready: true, userId: null, offline: false };
}

/** Shows the welcome screen when signed out; the app when signed in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, userId } = useUserId();
  if (!ready) return <Splash />;
  if (!userId) return <Welcome />;
  return <>{children}</>;
}

/**
 * Shown while auth loads. It waits a beat before appearing, so a fast load
 * goes straight from blank paper to the page with no flash in between.
 */
export function Splash() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="relative z-10 grid min-h-dvh place-items-center opacity-0 [animation:splash-in_400ms_var(--ease-out-soft)_350ms_forwards]"
    >
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-[30px] tracking-[-0.01em] text-ink italic">Ciao</p>
        {/* A tiny train shuttling along a rail. */}
        <div className="relative h-[3px] w-16 overflow-hidden rounded-full bg-line">
          <span className="absolute inset-y-0 left-0 w-5 rounded-full bg-accent [animation:splash-train_1.1s_ease-in-out_infinite_alternate]" />
        </div>
      </div>
      <style>{`
        @keyframes splash-in { to { opacity: 1; } }
        @keyframes splash-train { to { transform: translateX(44px); } }
      `}</style>
    </div>
  );
}
