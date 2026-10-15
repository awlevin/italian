"use client";

import { Fragment } from "react";
import { speak } from "@/lib/audio";
import { MARKUP, sayable } from "@/lib/text";



/**
 * Renders inline markup: «Italian» (tap to hear), ‹Spanish›, ~~wrong~~, **bold**.
 * Italian spans read as highlighted ink; Spanish reads as sea-blue italics.
 */
export function Rich({ text, speakable = true }: { text: string; speakable?: boolean }) {
  const parts = text.split(MARKUP);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("«")) {
          const it = p.slice(1, -1);
          return speakable && sayable(it) ? (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speak(it);
              }}
              className="it-mark cursor-pointer font-semibold text-ink decoration-transparent transition-colors hover:decoration-ink-3 active:text-accent"
              title="Tap to hear"
              lang="it"
            >
              {it}
            </button>
          ) : (
            <span key={i} className="it-mark font-semibold text-ink" lang="it">
              {it}
            </span>
          );
        }
        if (p.startsWith("‹"))
          return (
            <span key={i} className="font-medium italic text-sea" lang="es">
              {p.slice(1, -1)}
            </span>
          );
        if (p.startsWith("~~"))
          return (
            <s key={i} className="text-wrong decoration-wrong/70 decoration-2" lang="it">
              {p.slice(2, -2)}
            </s>
          );
        if (p.startsWith("**"))
          return (
            <strong key={i} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
