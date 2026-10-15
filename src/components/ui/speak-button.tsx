"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { onPlaying, speak } from "@/lib/audio";
import { IconSpeaker, IconTurtle } from "./icons";

/**
 * Plays Italian audio. Tapping again while (or just after) it plays
 * replays it slowly, like a patient friend repeating themselves.
 */
export function SpeakButton({
  text,
  size = "md",
  autoPlay = false,
  className = "",
  label = "Play audio",
}: {
  text: string;
  size?: "sm" | "md" | "lg";
  autoPlay?: boolean;
  className?: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => onPlaying((t) => setPlaying(t === text)), [text]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setTimeout(() => speak(text), 350);
    return () => clearTimeout(id);
  }, [autoPlay, text]);

  const play = () => {
    const now = Date.now();
    const isSlow = now - lastTap.current < 2500;
    lastTap.current = isSlow ? 0 : now;
    setSlow(isSlow);
    speak(text, { rate: isSlow ? 0.7 : 1 });
  };

  const dims = { sm: "size-8", md: "size-11", lg: "size-20" }[size];
  const icon = { sm: 16, md: 20, lg: 34 }[size];

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        play();
      }}
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${
        size === "lg"
          ? "bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-press)] active:translate-y-[4px] active:shadow-none"
          : "bg-accent-soft text-accent"
      } ${dims} ${className}`}
    >
      {playing && (
        <motion.span
          className="absolute inset-0 rounded-full bg-accent"
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative">
        {slow && playing ? <IconTurtle size={icon} /> : <IconSpeaker size={icon} />}
      </span>
    </motion.button>
  );
}
