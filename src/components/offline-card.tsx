"use client";

import { AnimatePresence, motion } from "motion/react";
import { download, useOfflineState, useOnline } from "@/lib/offline";
import { Button } from "./ui/button";
import { IconCheck, IconCloudOff, IconDownload } from "./ui/icons";

/** Saves every lesson and audio clip so the app works on planes and trains. */
export function OfflineCard() {
  const state = useOfflineState();
  const online = useOnline();
  if (state.phase === "unsupported" || state.phase === "checking") return null;

  const pct = state.phase === "downloading" ? state.done / Math.max(1, state.total) : state.phase === "ready" ? 1 : 0;
  const { title, sub } =
    state.phase === "ready"
      ? { title: "Ready for your trip", sub: "Every lesson and clip works offline" }
      : state.phase === "downloading"
        ? { title: "Downloading…", sub: `${Math.round(pct * 100)}% · keep the app open` }
        : !online
          ? { title: "Offline", sub: `Lessons work. ${state.audioMissing} clips use the phone's voice until you download` }
          : state.phase === "error"
            ? { title: "Download interrupted", sub: `${state.audioMissing} clips still to go` }
            : { title: "Take Ciao offline", sub: "Save all lessons and native audio for planes and trains" };

  return (
    <section
      aria-label="Offline"
      className="rounded-2xl border border-line bg-card p-3 pr-4 shadow-card"
      data-offline={state.phase}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${
            state.phase === "ready" ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"
          }`}
        >
          {state.phase === "ready" ? (
            <IconCheck size={20} strokeWidth={2.6} />
          ) : !online ? (
            <IconCloudOff size={20} />
          ) : (
            <IconDownload size={20} />
          )}
        </span>
        <span className="min-w-0 flex-1" role="status" aria-live="polite">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          <span className="block text-[13px] text-ink-3">{sub}</span>
        </span>
        {(state.phase === "idle" || state.phase === "error") && online && (
          <Button size="md" onClick={() => void download()} className="shrink-0">
            {state.phase === "error" ? "Retry" : "Download"}
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {state.phase === "downloading" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 h-[3px] overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct * 100)}
            >
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.2 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
