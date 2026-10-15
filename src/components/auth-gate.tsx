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

export function Splash() {
  return (
    <div className="relative z-10 grid min-h-dvh place-items-center">
      <p className="animate-pulse font-display text-[28px] text-ink-3 italic">Ponte</p>
    </div>
  );
}
