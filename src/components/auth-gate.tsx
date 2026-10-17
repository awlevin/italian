"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { lastUser, rememberUser, subscribeUser, useOnline } from "@/lib/offline";
import { Welcome } from "./welcome";


/**
 * The signed-in user. Clerk needs the network to start, so offline (or on
 * Wi-Fi that goes nowhere) this falls back to the last user who signed in on
 * this device. Their progress is already on the phone.
 */
export function useUserId(): { ready: boolean; userId: string | null; offline: boolean; clerkSignedOut: boolean } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const cached = useSyncExternalStore(subscribeUser, lastUser, () => null);

  // Forget the user only on a real sign-out (signed in, then not). A signed-out
  // answer from Clerk on a dead or captive connection must not lock them out.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      wasSignedIn.current = true;
      rememberUser(userId);
    } else if (wasSignedIn.current) {
      wasSignedIn.current = false;
      rememberUser(null);
    }
  }, [isLoaded, isSignedIn, userId]);

  const clerkSignedOut = isLoaded && !isSignedIn;
  if (isLoaded && isSignedIn) return { ready: true, userId, offline: false, clerkSignedOut };
  // Don't wait on Clerk: it can take seconds on a train. And a signed-out answer
  // can come from a dead connection, so the last user stays until the server
  // itself turns them away (see ProgressProvider).
  if (cached) return { ready: true, userId: cached, offline: true, clerkSignedOut };
  if (!isLoaded) return { ready: false, userId: null, offline: false, clerkSignedOut };
  return { ready: true, userId: null, offline: false, clerkSignedOut };
}

/** Shows the welcome screen when signed out; the app when signed in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, userId } = useUserId();
  const online = useOnline();
  if (!ready && !online) return <NeedsNetwork />;
  if (!ready) return <Splash />;
  if (!userId) return <Welcome />;
  return <>{children}</>;
}

/** Offline on a device nobody has signed in on yet: there is nothing to load. */
function NeedsNetwork() {
  return (
    <div role="status" className="relative z-10 grid min-h-dvh place-items-center px-8 text-center">
      <div className="max-w-[18rem] space-y-2">
        <p className="font-display text-[30px] tracking-[-0.01em] text-ink italic">Ciao</p>
        <p className="text-[15px] text-ink-2">
          You&apos;re offline. Connect once to sign in; after that, lessons work without a connection.
        </p>
      </div>
    </div>
  );
}

/**
 * Shown while the app starts. It waits a beat before appearing, so a fast load
 * goes straight from blank paper to the page with no flash in between. On a
 * slow start it says what is happening, then offers a reload. All of it is
 * plain HTML and CSS, so it still works if the app's scripts are what's slow.
 */
export function Splash() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="relative z-10 grid min-h-dvh place-items-center px-8 text-center opacity-0 [animation:splash-in_400ms_var(--ease-out-soft)_350ms_forwards]"
    >
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-[30px] tracking-[-0.01em] text-ink italic">Ciao</p>
        {/* A tiny train shuttling along a rail. */}
        <div className="relative h-[3px] w-16 overflow-hidden rounded-full bg-line">
          <span className="absolute inset-y-0 left-0 w-5 rounded-full bg-accent [animation:splash-train_1.1s_ease-in-out_infinite_alternate]" />
        </div>
        <div className="mt-4 grid min-h-[3.5rem] max-w-[17rem] text-[14px] leading-snug text-ink-3">
          <p className="col-start-1 row-start-1 opacity-0 [animation:splash-step_6s_linear_2.5s_forwards]">
            Opening your saved lessons…
          </p>
          <p className="col-start-1 row-start-1 opacity-0 [animation:splash-in_300ms_ease-out_8.5s_forwards]">
            Still starting. Slow connections can take a minute; your progress is safe on this phone.
          </p>
        </div>
        {/* A full reload, not a client navigation: it has to work even when the app's scripts never load. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="text-[14px] font-semibold text-accent underline underline-offset-4 opacity-0 [animation:splash-in_300ms_ease-out_12s_forwards]"
        >
          Reload
        </a>
      </div>
      <style>{`
        @keyframes splash-in { to { opacity: 1; } }
        @keyframes splash-step { 0% { opacity: 0; } 5%, 90% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes splash-train { to { transform: translateX(44px); } }
      `}</style>
    </div>
  );
}
