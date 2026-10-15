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
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <p className="font-display text-[22px] italic text-ink">Ponte</p>

      <div className="flex flex-1 flex-col justify-center gap-9 py-10">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-ink-3">PARTENZE · DEPARTURES</p>
          <div className="rounded-2xl bg-[#14100c] p-3 shadow-lift">
            <SplitFlap text="BENVENUTO" size="lg" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h1 className="font-display-wonk text-[44px] leading-[0.98] tracking-[-0.03em] text-balance">
            Italian, built on the Spanish you already speak.
          </h1>
          <p className="max-w-[36ch] text-[17px] leading-relaxed text-ink-2">
            Ten train stops from Milano to Palermo. Sound rules, the grammar that differs, and the phrases you will need tomorrow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="rounded-2xl border border-line bg-card/70 px-4 py-4"
        >
          <MorphDemo />
          <p className="mt-1 text-center text-[13px] text-ink-3">Your Spanish is already most of the way there.</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="space-y-2"
      >
        <SignUpButton mode="modal">
          <Button size="lg" block>
            Start the journey
          </Button>
        </SignUpButton>
        <SignInButton mode="modal">
          <Button size="md" variant="ghost" block>
            I already have a ticket · Sign in
          </Button>
        </SignInButton>
      </motion.div>
    </main>
  );
}
