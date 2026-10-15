"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { MorphWord } from "./exercises/morph";
import { Button } from "./ui/button";
import { SplitFlap } from "./ui/split-flap";

const DEMO = [
  { es: "noche", it: "notte" },
  { es: "ciudad", it: "città" },
  { es: "llave", it: "chiave" },
  { es: "nación", it: "nazione" },
  { es: "hijo", it: "figlio" },
  { es: "plaza", it: "piazza" },
];

function MorphDemo() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"es" | "it">("es");
  useEffect(() => {
    const id = setTimeout(
      () => {
        if (phase === "es") setPhase("it");
        else {
          setPhase("es");
          setI((n) => (n + 1) % DEMO.length);
        }
      },
      phase === "es" ? 1100 : 2200,
    );
    return () => clearTimeout(id);
  }, [phase]);
  const pair = DEMO[i];
  return (
    <div className="flex h-12 items-center justify-center">
      <MorphWord key={i} es={pair.es} it={pair.it} phase={phase} />
    </div>
  );
}

export function Welcome() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <p className="py-1.5 font-display text-[24px] tracking-[-0.01em] text-ink italic">Ponte</p>

      <div className="flex flex-1 flex-col justify-center gap-5 pt-4 pb-2 sm:gap-8 sm:py-8">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-ink-3">PARTENZE · DEPARTURES</p>
          <div className="relative overflow-hidden rounded-[20px] bg-board px-3 py-3.5 shadow-lift ring-1 ring-black/5 dark:ring-white/10">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
            <SplitFlap text="BENVENUTO" size="lg" className="justify-center" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <h1 className="font-display-wonk text-[clamp(34px,10vw,52px)] leading-[0.98] tracking-[-0.03em] text-balance">
            Learn Italian.
          </h1>
          <p className="max-w-[34ch] text-[16px] leading-snug text-ink-2 sm:text-[17px]">
            Ten train stops, Milano to Palermo. Only what differs from Spanish, plus the phrases you need tomorrow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="rounded-2xl border border-line bg-card/70 px-4 pt-2 pb-3 shadow-card"
        >
          <MorphDemo />
          <p className="mt-1 text-center text-[13px] text-ink-3">Your Spanish is already most of the way there.</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        // Pinned to the bottom so the way in is always on screen, even on short phones.
        className="sticky bottom-0 -mx-6 space-y-1 bg-linear-to-t from-paper from-75% to-transparent px-6 pt-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <SignUpButton mode="modal">
          <Button size="lg" block>
            Start the journey
          </Button>
        </SignUpButton>
        <SignInButton mode="modal">
          <Button size="md" variant="ghost" block>
            <span className="font-medium text-ink-2">Already have a ticket?</span>
            <span className="text-accent">Sign in</span>
          </Button>
        </SignInButton>
      </motion.div>
    </main>
  );
}
