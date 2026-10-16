"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { phrasebook } from "@/content/phrasebook";
import type { Phrase } from "@/content/types";
import { speak, stop } from "@/lib/audio";
import { fold } from "@/lib/text";
import { useDispatch, useProgress } from "./progress/provider";
import { IconChevronDown, IconRotate, IconSearch, IconStar, IconX } from "./ui/icons";
import { SpeakButton } from "./ui/speak-button";
import { useT } from "@/lib/locale";

const byId = new Map(phrasebook.flatMap((g) => g.phrases.map((p) => [p.id, p] as const)));
const EASE = [0.22, 1, 0.36, 1] as const;

function Row({ p, starred, onShow }: { p: Phrase; starred: boolean; onShow: (p: Phrase) => void }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const toggle = () => setOpen((o) => !o);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
        className="group -mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 transition-colors select-none active:bg-paper-2"
      >
        {/* The pseudo-element grows the 32px button to a 44px tap target. */}
        <SpeakButton text={p.it} size="sm" className="before:absolute before:-inset-1.5 before:content-['']" label={`Play “${p.it}”`} />
        <div className="min-w-0 flex-1">
          <p lang="it" className="text-[17px] leading-snug font-semibold text-ink">
            {p.it}
            {starred && <IconStar size={13} filled className="ml-1.5 inline -translate-y-px text-mark" />}
          </p>
          <p className="text-[14px] leading-snug text-ink-2">{p.en}</p>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }} className="shrink-0 text-ink-3">
          <IconChevronDown size={18} />
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-4 pl-11">
              <p className="font-mono text-[13px] leading-relaxed text-ink-2">
                <span className="mr-1.5 text-[10px] font-bold tracking-[0.16em] text-ink-3 uppercase">Say</span>
                {p.say}
              </p>
              {p.note && <p className="text-[14px] leading-snug text-ink-2">{p.note}</p>}
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={starred}
                  onClick={() => dispatch({ t: "star", phraseId: p.id, on: !starred })}
                  className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors ${
                    starred ? "border-mark bg-mark-soft text-ink" : "border-line bg-card text-ink-2 hover:text-ink"
                  }`}
                >
                  <motion.span
                    key={String(starred)}
                    initial={starred ? { scale: 0.4, rotate: -60 } : false}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 14 }}
                  >
                    <IconStar size={16} filled={starred} className={starred ? "text-mark" : ""} />
                  </motion.span>
                  {starred ? "Saved" : "Save"}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onShow(p)}
                  className="flex h-11 items-center rounded-full border border-line bg-card px-4 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink"
                >
                  Show someone
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Full-screen card to hold up for a waiter, a ticket clerk or a pharmacist. */
function ShowCard({ phrase, onClose }: { phrase: Phrase; onClose: () => void }) {
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    // Keep the screen on while someone reads it.
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
      void lock?.release().catch(() => {});
      stop();
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label={phrase.it}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-paper px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 active:bg-paper-2"
        >
          <IconX size={24} />
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setTurned((t) => !t)}
          aria-pressed={turned}
          className="flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[14px] font-semibold text-ink-2"
        >
          <IconRotate size={17} />
          {turned ? "Turn back" : "Turn to them"}
        </motion.button>
      </div>

      <motion.div
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1, rotate: turned ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="flex flex-1 flex-col justify-center py-6"
      >
        <button
          type="button"
          onClick={() => speak(phrase.it)}
          className="text-left"
          aria-label={`Play “${phrase.it}”`}
        >
          <span
            lang="it"
            className="block font-display text-[clamp(44px,13vw,96px)] leading-[1.02] tracking-[-0.025em] text-balance text-ink"
          >
            {phrase.it}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {!turned && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-1.5"
            >
              <p className="text-[19px] leading-snug text-ink-2">{phrase.en}</p>
              <p className="font-mono text-[13px] text-ink-3">{phrase.say}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-4">
        <SpeakButton text={phrase.it} size="lg" label={`Play “${phrase.it}”`} />
        <p className="text-[14px] leading-snug text-ink-3">
          Tap to play it aloud.
          <br />
          Tap again for slow.
        </p>
      </div>
    </motion.div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        placeholder="bathroom, conto, treno…"
        aria-label="Search phrases"
        className="h-12 w-full appearance-none rounded-2xl border border-line bg-card pr-12 pl-11 text-[16px] text-ink shadow-card outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink"
          >
            <span className="grid size-5 place-items-center rounded-full bg-ink-3/25">
              <IconX size={12} strokeWidth={3} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Which group heading has scrolled under the sticky bar. */
function useScrollSpy(ids: string[], offset: () => number, enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  const lock = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (lock.current) return;
      const line = offset() + 8;
      let current = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => (raf ||= requestAnimationFrame(measure));
    const onEnd = () => {
      lock.current = null;
      onScroll();
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onEnd);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onEnd);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids, offset, enabled]);

  /** Smooth-scrolls to a group; the chip lights up at once instead of passing over every group on the way. */
  const jump = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      lock.current = id;
      setActive(id);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset(), behavior: reduce ? "auto" : "smooth" });
      // Safety net for browsers without `scrollend`.
      setTimeout(() => lock.current === id && (lock.current = null), 1200);
    },
    [offset],
  );

  return [active, jump] as const;
}

export function Phrasebook() {
  const progress = useProgress();
  const t = useT();
  const [q, setQ] = useState("");
  const query = useDeferredValue(fold(q.trim()));
  const [showing, setShowing] = useState<Phrase | null>(null);
  const starred = new Set(progress.starred);
  const bar = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const saved = progress.starred.map((id) => byId.get(id)).filter((p): p is Phrase => !!p);
    const all = [...(saved.length ? [{ id: "saved", title: "Saved", it: t("Saved", "Preferiti"), phrases: saved }] : []), ...phrasebook];
    if (!query) return all;
    return all
      .filter((g) => g.id !== "saved")
      .map((g) => ({ ...g, phrases: g.phrases.filter((p) => fold(`${p.it} ${p.en}`).includes(query)) }))
      .filter((g) => g.phrases.length);
  }, [progress.starred, query, t]);

  const ids = useMemo(() => groups.map((g) => g.id), [groups]);
  // Where the sticky bar ends once stuck (not where it happens to be now).
  const offset = useCallback(() => {
    const el = bar.current;
    return el ? (parseFloat(getComputedStyle(el).top) || 0) + el.offsetHeight + 4 : 0;
  }, []);
  const [active, jump] = useScrollSpy(ids, offset, !query);

  // Keep the lit chip in view inside its own scroller (never scrolls the page).
  useEffect(() => {
    const row = chips.current;
    const chip = row?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!row || !chip) return;
    const target = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  const close = useCallback(() => setShowing(null), []);

  return (
    <div className="pt-2">
      <div className="space-y-1.5 pb-4">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">{t("Phrasebook", "Frasario")}</h1>
        <p className="text-[16px] text-ink-2">The phrases you will actually use. Tap one for how to say it.</p>
      </div>

      <div
        ref={bar}
        className="sticky top-[env(safe-area-inset-top)] z-20 -mx-5 space-y-3 bg-paper px-5 pt-2 pb-3 shadow-[0_10px_12px_-12px_rgb(var(--shadow)/0.22)]"
      >
        <SearchField value={q} onChange={setQ} />
        {!query && (
          <div ref={chips} className="relative -mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => {
              const on = active === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  data-chip={g.id}
                  onClick={() => jump(g.id)}
                  aria-current={on ? "true" : undefined}
                  className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 ${
                    on ? "text-paper" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {on ? (
                    <motion.span
                      layoutId="chip-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-full border border-line bg-card" />
                  )}
                  {g.id === "saved" && <IconStar size={13} filled className="relative text-mark" />}
                  <span className="relative">{g.it}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-7 pt-2">
        {groups.map((g) => (
          <section key={g.id} id={g.id}>
            <h2 className="flex items-baseline gap-2 border-b border-line pb-2">
              <span className="font-display text-[24px] italic">{g.it}</span>
              <span className="text-[13px] text-ink-3">{g.title}</span>
              {query && <span className="ml-auto font-mono text-[11px] font-bold text-ink-3">{g.phrases.length}</span>}
            </h2>
            <ul className="divide-y divide-line/60">
              {g.phrases.map((p) => (
                <Row key={`${g.id}-${p.id}`} p={p} starred={starred.has(p.id)} onShow={setShowing} />
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <div className="py-14 text-center">
            <p className="font-display text-[24px] text-ink-2 italic">Niente.</p>
            <p className="mt-1 text-[15px] text-ink-3">No phrase matches “{q.trim()}”. Try English or Italian.</p>
          </div>
        )}
      </div>

      <AnimatePresence>{showing && <ShowCard key={showing.id} phrase={showing} onClose={close} />}</AnimatePresence>
    </div>
  );
}
