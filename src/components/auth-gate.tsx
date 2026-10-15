"use client";

import { useAuth } from "@clerk/nextjs";
import { Welcome } from "./welcome";

/** Shows the welcome screen when signed out; the app when signed in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Splash />;
  if (!isSignedIn) return <Welcome />;
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
