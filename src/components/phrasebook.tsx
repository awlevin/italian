"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { phrasebook } from "@/content/phrasebook";
import { ruleById, ruleHref } from "@/content/rules";
import type { Phrase } from "@/content/types";
import { ADDED_GROUP, type AddedPhrase, type Details, isPending, kindOf, WORDS_GROUP } from "@/lib/added-phrases";
import { speak, stop } from "@/lib/audio";
import { fold } from "@/lib/text";
import { AddError, useAddedPhrases } from "./added-phrases";
import { useDispatch, useProgress } from "./progress/provider";
import { IconArrowRight, IconBridge, IconChevronDown, IconLightbulb, IconPlus, IconRotate, IconSearch, IconStar, IconTrash, IconX } from "./ui/icons";
import { Rich } from "./ui/rich";
import { SpeakButton } from "./ui/speak-button";
import { useT } from "@/lib/locale";

const builtIn = phrasebook.flatMap((g) => g.phrases.map((p) => [p.id, p] as const));
const EASE = [0.22, 1, 0.36, 1] as const;
/** Your own groups show this many until opened, so Saved and the rest stay close. */
const PEEK = 5;

const POS = { noun: "noun", verb: "verb", adjective: "adj.", adverb: "adv.", other: "" } as const;

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="mr-1.5 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-3 uppercase">{children}</span>
);

/** Small Italian chips that play when tapped: a word's forms, or a phrase's building blocks. */
function Chips({ items }: { items: { it: string; en?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((x, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              speak(x.it);
            }}
            aria-label={`Play “${x.it}”`}
            className="flex min-h-11 flex-col items-start justify-center rounded-xl border border-line bg-card px-3 py-1.5 text-left transition-colors active:bg-paper-2"
          >
            <span lang="it" className="text-[15px] leading-tight font-semibold text-ink">
              {x.it}
            </span>
            {x.en && <span className="text-[12px] leading-tight text-ink-3">{x.en}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What an added entry teaches: its forms or parts, the Spanish bridge, the grammar and the lesson behind it. */
function Learn({ d }: { d: Details }) {
  const t = useT();
  const rule = d.rule ? ruleById.get(d.rule) : undefined;
  return (
    <>
      {d.kind === "word" && d.forms.length > 1 && <Chips items={d.forms.map((it) => ({ it }))} />}
      {d.kind === "phrase" && d.parts.length > 1 && <Chips items={d.parts} />}
      {d.kind === "word" && d.example.it && (
        <div className="flex items-center gap-2.5 rounded-xl bg-paper-2/70 py-2 pr-3 pl-2">
          <SpeakButton text={d.example.it} size="sm" label={`Play “${d.example.it}”`} />
          <div className="min-w-0">
            <p lang="it" className="text-[15px] leading-snug text-ink">
              {d.example.it}
            </p>
            <p className="text-[13px] leading-snug text-ink-3">{d.example.en}</p>
          </div>
        </div>
      )}
      {(d.es || d.bridge) && (
        <p className="flex gap-2 text-[14px] leading-snug text-ink-2">
          <IconBridge size={16} className="mt-0.5 shrink-0 text-bridge" />
          <span>
            {d.es && (
              <span className="font-medium text-bridge italic" lang="es">
                {d.es}
                {d.bridge && " — "}
              </span>
            )}
            {d.bridge && <Rich text={d.bridge} />}
          </span>
        </p>
      )}
      {d.grammar && (
        <p className="flex gap-2 text-[14px] leading-snug text-ink-2">
          <IconLightbulb size={16} className="mt-0.5 shrink-0 text-mark" />
          <span>
            <Rich text={d.grammar} />
          </span>
        </p>
      )}
      {rule && (
        <Link
          href={ruleHref(rule)}
          onClick={(e) => e.stopPropagation()}
          className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 transition-colors active:bg-paper-2"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-accent uppercase">
              {t("The rule", "La regola")} · {rule.lesson.city}
            </p>
            <p className="truncate text-[15px] leading-snug font-semibold text-ink">{rule.title}</p>
          </div>
          <IconArrowRight size={18} className="shrink-0 text-ink-3" />
        </Link>
      )}
    </>
  );
}

function Row({
  p,
  starred,
  onShow,
  onRemove,
  details,
  fresh = false,
}: {
  p: Phrase;
  starred: boolean;
  onShow: (p: Phrase) => void;
  /** Added phrases can be taken out again. */
  onRemove?: () => void;
  /** What an added entry teaches, shown when it opens. */
  details?: Details | null;
  /** Just finished adding: it glows once so the eye finds it. */
  fresh?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pos = details?.kind === "word" ? POS[details.pos] : "";
  const dispatch = useDispatch();
  const toggle = () => setOpen((o) => !o);
  return (
    <li className="relative">
      {fresh && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-x-2 inset-y-0.5 rounded-xl bg-mark-soft"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.2, delay: 0.6, ease: "easeOut" }}
        />
      )}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
        className="group relative -mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 transition-colors select-none active:bg-paper-2"
      >
        {/* The pseudo-element grows the 32px button to a 44px tap target. */}
        <SpeakButton text={p.it} size="sm" className="before:absolute before:-inset-1.5 before:content-['']" label={`Play “${p.it}”`} />
        <div className="min-w-0 flex-1">
          <p lang="it" className="text-[17px] leading-snug font-semibold text-ink">
            {p.it}
            {starred && <IconStar size={13} filled className="ml-1.5 inline -translate-y-px text-mark" />}
          </p>
          <p className="text-[14px] leading-snug text-ink-2">
            {p.en}
            {pos && <span className="ml-2 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-3 uppercase">{pos}</span>}
          </p>
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
                <Eyebrow>Say</Eyebrow>
                {p.say}
              </p>
              {details && <Learn d={details} />}
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
                  className="flex h-11 items-center rounded-full border border-line bg-card px-4 text-[14px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:text-ink"
                >
                  Show someone
                </motion.button>
                {onRemove && <RemoveButton onRemove={onRemove} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * A small bin at the end of the action row. The first tap arms it and a bubble
 * asks for a second; nothing in the row moves.
 */
function RemoveButton({ onRemove }: { onRemove: () => void }) {
  const t = useT();
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!sure) return;
    const id = setTimeout(() => setSure(false), 3000);
    return () => clearTimeout(id);
  }, [sure]);
  return (
    <div className="relative ml-auto">
      <AnimatePresence>
        {sure && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 bottom-full mb-2 origin-bottom-right rounded-lg bg-wrong px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-paper shadow-card"
          >
            {t("Tap again to remove", "Tocca di nuovo")}
            <span className="absolute top-full right-4 size-2 -translate-y-1 rotate-45 bg-wrong" />
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        animate={sure ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => (sure ? onRemove() : setSure(true))}
        aria-label={sure ? t("Confirm remove", "Conferma rimozione") : t("Remove from the phrasebook", "Rimuovi dal frasario")}
        className={`grid size-11 place-items-center rounded-full border transition-colors ${
          sure ? "border-wrong bg-wrong-soft text-wrong" : "border-transparent text-ink-3 hover:text-ink"
        }`}
      >
        <IconTrash size={18} />
      </motion.button>
    </div>
  );
}

const STAGES = { translating: 0.5, recording: 0.92, ready: 1, failed: 1 } as const;

/** A phrase on its way: a bar that creeps through translating, then recording. Or why it failed. */
function PendingRow({ p, onRetry, onDismiss }: { p: AddedPhrase; onRetry: () => void; onDismiss: () => void }) {
  const t = useT();
  const failed = p.status === "failed";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="py-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${failed ? "bg-wrong-soft text-wrong" : "bg-mark-soft text-mark"}`}>
          {failed ? (
            <IconX size={15} strokeWidth={2.5} />
          ) : (
            <motion.span
              className="block size-3.5 rounded-full border-2 border-current border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] leading-snug font-semibold text-ink">“{p.query}”</p>
          <p className={`text-[14px] leading-snug ${failed ? "text-wrong" : "text-ink-2"}`}>
            {failed
              ? (p.error ?? t("Couldn't add it.", "Non è stato possibile aggiungerla."))
              : p.status === "translating"
                ? t("Translating…", "Traduzione…")
                : t("Recording the audio…", "Registrazione dell'audio…")}
          </p>
        </div>
      </div>
      {failed ? (
        <div className="mt-2 flex gap-2 pl-11">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="flex h-11 items-center rounded-full border border-line bg-card px-4 text-[14px] font-semibold text-ink"
          >
            {t("Try again", "Riprova")}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="flex h-11 items-center rounded-full px-3 text-[14px] font-semibold text-ink-3 hover:text-ink"
          >
            {t("Dismiss", "Ignora")}
          </motion.button>
        </div>
      ) : (
        <div className="mt-2.5 ml-11 h-1 overflow-hidden rounded-full bg-paper-2">
          <motion.div
            className="relative h-full overflow-hidden rounded-full bg-mark"
            initial={{ width: "4%" }}
            animate={{ width: `${STAGES[p.status] * 100}%` }}
            // Eases toward the end of the stage; the shine keeps it visibly working if the server is slow.
            transition={{ duration: p.status === "translating" ? 3 : 4, ease: [0.1, 0.6, 0.3, 1] }}
          >
            <motion.span
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              initial={{ left: "-50%" }}
              animate={{ left: "100%" }}
              transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
            />
          </motion.div>
        </div>
      )}
    </motion.li>
  );
}

/**
 * Offered whenever there is a search: front and centre when nothing matched,
 * a quiet line under the results when something did.
 */
function AddPrompt({ q, empty, onAdd }: { q: string; empty: boolean; onAdd: (q: string) => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await onAdd(q);
    } catch (e) {
      const msg = e instanceof AddError ? e.message : "failed";
      setError(
        msg === "offline"
          ? t("You're offline. Try again when you have signal.", "Sei offline. Riprova quando hai campo.")
          : msg === "failed"
            ? t("Couldn't send it. Try again.", "Invio non riuscito. Riprova.")
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const errorLine = error && <p className="mt-2 text-[14px] text-wrong">{error}</p>;

  if (!empty)
    return (
      <div className="border-t border-line pt-4 text-center">
        <button type="button" onClick={add} disabled={busy} className="text-[15px] text-ink-2 disabled:opacity-60">
          {t("Not what you need?", "Non è quella giusta?")}{" "}
          <span className="font-semibold text-accent underline decoration-accent/40 underline-offset-4">
            {t(`Add “${q}”`, `Aggiungi “${q}”`)}
          </span>
        </button>
        {errorLine}
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="py-10 text-center"
    >
      <p className="font-display text-[24px] text-ink-2 italic">Niente.</p>
      <p className="mt-1 text-[15px] text-ink-3">{t(`No phrase matches “${q}” yet.`, `Nessuna frase per “${q}”, per ora.`)}</p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={add}
        disabled={busy}
        className="mx-auto mt-5 flex h-12 max-w-full items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-semibold text-accent-ink shadow-[0_4px_0_var(--accent-press)] transition-opacity active:translate-y-[4px] active:shadow-none disabled:opacity-70"
      >
        <IconPlus size={18} strokeWidth={2.5} className="shrink-0" />
        <span className="truncate">{t(`Add “${q}”`, `Aggiungi “${q}”`)}</span>
      </motion.button>
      <p className="mx-auto mt-3 max-w-72 text-[13px] leading-snug text-ink-3">
        {t(
          "It gets translated and recorded in a few seconds, then it's in the phrasebook for everyone.",
          "Viene tradotta e registrata in pochi secondi, poi è nel frasario per tutti.",
        )}
      </p>
      {errorLine}
    </motion.div>
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
  const added = useAddedPhrases();
  const [q, setQ] = useState("");
  const query = useDeferredValue(fold(q.trim()));
  const [showing, setShowing] = useState<Phrase | null>(null);
  const starred = new Set(progress.starred);
  const bar = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);

  const addedById = useMemo(() => new Map(added.phrases.map((p) => [p.id, p])), [added.phrases]);
  const groups = useMemo(() => {
    const ready = added.phrases.filter((p) => p.status === "ready");
    const byId = new Map<string, Phrase>([...builtIn, ...ready.map((p) => [p.id, p] as const)]);
    const saved = progress.starred.map((id) => byId.get(id)).filter((p): p is Phrase => !!p);
    // Yours first and newest first, so a phrase just added is the first thing on the page.
    const phrases = added.phrases.filter((p) => kindOf(p) === "phrase");
    const words = added.phrases.filter((p) => kindOf(p) === "word");
    const all = [
      ...(phrases.length ? [{ id: ADDED_GROUP, title: "Your phrases", it: "Frasi", phrases: phrases as Phrase[] }] : []),
      ...(words.length ? [{ id: WORDS_GROUP, title: "Your words", it: "Parole", phrases: words as Phrase[] }] : []),
      ...(saved.length ? [{ id: "saved", title: "Saved", it: t("Saved", "Preferiti"), phrases: saved }] : []),
      ...phrasebook,
    ];
    if (!query) return all;
    // An added phrase also matches what was typed to ask for it.
    const text = (p: Phrase) => `${p.it} ${p.en} ${addedById.get(p.id)?.query ?? ""}`;
    return all
      .filter((g) => g.id !== "saved")
      .map((g) => ({ ...g, phrases: g.phrases.filter((p) => fold(text(p)).includes(query)) }))
      .filter((g) => g.phrases.length);
  }, [added.phrases, addedById, progress.starred, query, t]);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  // Phrases seen on their way in: when one turns ready it glows once.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const waiting = useRef(new Set<string>());
  useEffect(() => {
    const done = added.phrases.filter((p) => p.status === "ready" && waiting.current.has(p.id));
    added.phrases.forEach((p) => isPending(p) && waiting.current.add(p.id));
    if (!done.length) return;
    done.forEach((p) => waiting.current.delete(p.id));
    const ids = done.map((p) => p.id);
    setFresh((f) => new Set([...f, ...ids]));
    // Once only: a row that remounts later (search, Show all) doesn't glow again.
    setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !ids.includes(id)))), 3000);
  }, [added.phrases]);
  // Offer to add the search unless it was already asked for.
  const asked = !!query && added.phrases.some((p) => fold(p.query) === query);

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
                  {(g.id === ADDED_GROUP || g.id === WORDS_GROUP) && <span className="relative size-1.5 rounded-full bg-accent" />}
                  <span className="relative">{g.it}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-7 pt-2">
        {groups.map((g) => {
          const mine = g.id === ADDED_GROUP || g.id === WORDS_GROUP;
          const capped = mine && !query && !opened.has(g.id) && g.phrases.length > PEEK + 1;
          const shown = capped ? g.phrases.slice(0, PEEK) : g.phrases;
          return (
            <section key={g.id} id={g.id}>
              <h2 className="flex items-baseline gap-2 border-b border-line pb-2">
                <span className="font-display text-[24px] italic">{g.it}</span>
                <span className="text-[13px] text-ink-3">{g.title}</span>
                {(query || mine) && <span className="ml-auto font-mono text-[11px] font-bold text-ink-3">{g.phrases.length}</span>}
              </h2>
              <ul className="divide-y divide-line/60">
                <AnimatePresence initial={false}>
                  {shown.map((p) => {
                    const a = addedById.get(p.id);
                    if (a && a.status !== "ready")
                      return (
                        <PendingRow
                          key={`${g.id}-${p.id}`}
                          p={a}
                          onRetry={() => void added.add(a.query).catch(() => {})}
                          onDismiss={() => void added.remove(a.id)}
                        />
                      );
                    return (
                      <Row
                        key={`${g.id}-${p.id}`}
                        p={p}
                        starred={starred.has(p.id)}
                        onShow={setShowing}
                        onRemove={a && mine ? () => void added.remove(a.id) : undefined}
                        details={a?.details}
                        fresh={mine && fresh.has(p.id)}
                      />
                    );
                  })}
                </AnimatePresence>
              </ul>
              {capped && (
                <button
                  type="button"
                  onClick={() => setOpened((o) => new Set([...o, g.id]))}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold text-accent transition-colors active:bg-paper-2"
                >
                  {t(`Show all ${g.phrases.length}`, `Mostra tutte (${g.phrases.length})`)}
                  <IconChevronDown size={16} />
                </button>
              )}
            </section>
          );
        })}
        {query && !asked && <AddPrompt key={query} q={q.trim()} empty={groups.length === 0} onAdd={added.add} />}
      </div>

      <AnimatePresence>{showing && <ShowCard key={showing.id} phrase={showing} onClose={close} />}</AnimatePresence>
    </div>
  );
}
