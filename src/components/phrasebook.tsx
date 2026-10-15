"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { phrasebook } from "@/content/phrasebook";
import type { Phrase } from "@/content/types";
import { fold } from "@/lib/text";
import { speak } from "@/lib/audio";
import { useDispatch, useProgress } from "./progress/provider";
import { IconStar, IconX } from "./ui/icons";
import { SpeakButton } from "./ui/speak-button";

const byId = new Map(phrasebook.flatMap((g) => g.phrases.map((p) => [p.id, p] as const)));

function Row({ p, starred, onShow }: { p: Phrase; starred: boolean; onShow: (p: Phrase) => void }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  return (
    <li className="py-1">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
        className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2.5 transition-colors"
      >
        <SpeakButton text={p.it} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p lang="it" className="text-[17px] leading-snug font-semibold text-ink">
            {p.it}
            {starred && <IconStar size={13} filled className="ml-1.5 inline -translate-y-px text-lemon" />}
          </p>
          <p className="text-[14px] leading-snug text-ink-2">{p.en}</p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-3 pl-12">
              <p className="font-mono text-[13px] text-ink-2">
                <span className="text-ink-3">say </span>
                {p.say}
              </p>
              {p.note && <p className="text-[14px] leading-snug text-ink-2">{p.note}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ t: "star", phraseId: p.id, on: !starred })}
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                    starred ? "border-lemon bg-lemon-soft text-ink" : "border-line text-ink-2 hover:text-ink"
                  }`}
                >
                  <motion.span key={String(starred)} initial={{ scale: 0.5, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}>
                    <IconStar size={15} filled={starred} className={starred ? "text-lemon" : ""} />
                  </motion.span>
                  {starred ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => onShow(p)}
                  className="flex h-9 items-center rounded-full border border-line px-3 text-[13px] font-semibold text-ink-2 hover:text-ink"
                >
                  Show someone
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Phrasebook() {
  const progress = useProgress();
  const [q, setQ] = useState("");
  const query = useDeferredValue(fold(q));
  const [showing, setShowing] = useState<Phrase | null>(null);
  const starred = new Set(progress.starred);

  const groups = useMemo(() => {
    const all = [
      ...(progress.starred.length
        ? [{ id: "saved", title: "Saved", it: "Preferiti", phrases: progress.starred.map((id) => byId.get(id)).filter(Boolean) as Phrase[] }]
        : []),
      ...phrasebook,
    ];
    if (!query) return all;
    return all
      .map((g) => ({ ...g, phrases: g.phrases.filter((p) => fold(`${p.it} ${p.en}`).includes(query)) }))
      .filter((g) => g.phrases.length);
  }, [progress.starred, query]);

  return (
    <div className="space-y-5 pt-3">
      <div className="space-y-2">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">Frasario</h1>
        <p className="text-[16px] text-ink-2">The phrases you will actually use. Tap one for how to say it.</p>
      </div>

      <div className="sticky top-0 z-20 -mx-5 space-y-3 bg-paper/90 px-5 pt-2 pb-3 backdrop-blur-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: bathroom, conto, treno…"
          aria-label="Search phrases"
          className="h-12 w-full rounded-2xl border-2 border-line bg-card px-4 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:border-sea"
        />
        {!query && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="shrink-0 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
              >
                {g.it}
              </a>
            ))}
          </div>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.id} id={g.id} className="scroll-mt-36">
          <h2 className="flex items-baseline gap-2 border-b border-line pb-2">
            <span className="font-display text-[24px] italic">{g.it}</span>
            <span className="text-[13px] text-ink-3">{g.title}</span>
          </h2>
          <ul className="divide-y divide-line/60">
            {g.phrases.map((p) => (
              <Row key={`${g.id}-${p.id}`} p={p} starred={starred.has(p.id)} onShow={setShowing} />
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="py-10 text-center text-ink-3">Niente. Try another word.</p>}

      <AnimatePresence>
        {showing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-paper px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
            onClick={() => setShowing(null)}
          >
            <button type="button" aria-label="Close" className="ml-auto grid size-11 place-items-center rounded-full text-ink-3 hover:bg-paper-2">
              <IconX size={24} />
            </button>
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="flex flex-1 flex-col justify-center gap-6"
              onClick={(e) => {
                e.stopPropagation();
                speak(showing.it);
              }}
            >
              <p lang="it" className="font-display text-[clamp(40px,11vw,72px)] leading-[1.05] tracking-[-0.02em] text-balance">
                {showing.it}
              </p>
              <p className="text-[20px] text-ink-2">{showing.en}</p>
            </motion.div>
            <p className="text-center text-[13px] text-ink-3">Tap the phrase to play it aloud · tap anywhere else to close</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
