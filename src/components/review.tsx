"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { allItems, allLessons, itemById, lines } from "@/content/course";
import { ruleById, ruleHref } from "@/content/rules";
import type { AddedPhrase } from "@/lib/added-phrases";
import { shuffle } from "@/lib/diff";
import { byRule, cardFor, cardId } from "@/lib/phrase-cards";
import { dueItemIds } from "@/lib/stats";
import type { Snapshot } from "@/lib/sync";
import { Session, type SessionItem, type SessionResult } from "./lesson/session";
import { useDispatch, useProgress, useProgressReady } from "./progress/provider";
import { useReviewItems } from "./review-items";
import { Button, ButtonLink } from "./ui/button";
import { IconArrowRight, IconBook, IconCheck, IconRepeat, IconTrain } from "./ui/icons";
import { Rich } from "./ui/rich";
import { useT } from "@/lib/locale";
import { useHideChrome } from "./shell";

const SESSION_SIZE = 12;
/** New phrasebook entries per session: a handful, beside whatever is due. */
const NEW_ADDED = 8;
/** Rules listed under "The rules behind your phrases". */
const RULES_SHOWN = 6;
const EASE = [0.22, 1, 0.36, 1] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "in 40 min", "in 3 h", "tomorrow", "in 4 days". */
function fromNow(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

export function Review() {
  const progress = useProgress();
  const ready = useProgressReady();
  const dispatch = useDispatch();
  const t = useT();
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  // A running session owns a history entry (?s=1): the session's Leave link
  // (to /review) and the phone's back gesture both end it.
  const inSession = useSearchParams().has("s");
  useEffect(() => {
    if (inSession && !session) window.history.replaceState(null, "", "/review");
  }, [inSession, session]);

  const { added, addedByCard, has } = useReviewItems();
  const due = useMemo(() => dueItemIds(progress).filter(has), [progress, has]);
  const seen = Object.keys(progress.items).filter(has);
  const completedLessons = allLessons.filter((l) => progress.lessons[l.id]?.completedAt);
  const [now] = useState(() => Date.now());
  const nextDue = useMemo(() => {
    const times = Object.entries(progress.items)
      .filter(([id]) => has(id))
      .map(([, v]) => Date.parse(v.dueAt))
      .filter((t) => t > now);
    return times.length ? Math.min(...times) : null;
  }, [progress.items, now, has]);

  const start = (ids: string[]) => {
    setResult(null);
    window.history.pushState(null, "", "/review?s=1");
    setSession(
      ids.slice(0, SESSION_SIZE).map((id) => {
        const it = itemById.get(id);
        if (it) return { key: id, step: it.step, label: `${it.lesson.city} · ${it.lesson.title}` };
        // An entry from the phrasebook: its card gets harder as it is learned.
        const p = addedByCard.get(id)!;
        return { key: id, step: cardFor(p, added, progress.items[id]?.box), label: t("Your phrasebook", "Il tuo frasario") };
      }),
    );
  };

  // Weakest first, then a shuffle of the rest.
  const weakestFirst = (ids: string[]) => {
    const weak = [...ids].sort((a, b) => (progress.items[a]?.box ?? 0) - (progress.items[b]?.box ?? 0)).slice(0, 6);
    return [...weak, ...shuffle(ids.filter((id) => !weak.includes(id)))];
  };
  const practiceAll = () => start(weakestFirst(seen));

  // Entries never practised, newest first (the order the phrasebook sends them in).
  const newAdded = added.filter((p) => !progress.items[cardId(p)]);
  const practiceAdded = () => {
    const dueAdded = due.filter((id) => addedByCard.has(id));
    if (newAdded.length) start([...newAdded.slice(0, NEW_ADDED).map(cardId), ...dueAdded]);
    else start(weakestFirst(added.map(cardId)));
  };

  const onAnswer = useCallback(
    (item: SessionItem, correct: boolean) => dispatch({ t: "answer", itemId: item.key, correct }),
    [dispatch],
  );
  const onFinish = useCallback((r: SessionResult) => {
    setResult(r);
    setSession(null);
    window.history.replaceState(null, "", "/review");
    window.scrollTo({ top: 0 });
  }, []);

  const sessionOn = !!session && inSession;
  useHideChrome(sessionOn);

  if (sessionOn) {
    return <Session items={session} exitHref="/review" onAnswer={onAnswer} onFinish={onFinish} />;
  }

  const batch = Math.min(due.length, SESSION_SIZE);

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-1.5">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">{t("Review", "Ripasso")}</h1>
        <p className="text-[16px] leading-relaxed text-ink-2">Missed cards come back sooner, solid ones later. A few minutes a day keeps it all fresh.</p>
      </div>

      <AnimatePresence initial={false}>
        {result && result.exercises > 0 && <ResultCard key="result" result={result} />}
      </AnimatePresence>

      <motion.div layout="position" className="rounded-[22px] border border-line bg-card p-5 shadow-card">
        {!ready ? (
          <div className="h-[132px] animate-pulse rounded-2xl bg-paper-2/60" />
        ) : due.length > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <IconRepeat size={26} />
              </div>
              <div>
                <p className="font-display text-[34px] leading-none tabular-nums">{due.length}</p>
                <p className="mt-1 text-[14px] text-ink-2">
                  {due.length === 1 ? "card due now" : "cards due now"}
                  <span className="text-ink-3"> · about {Math.max(1, Math.round((batch * 10) / 60))} min</span>
                </p>
              </div>
            </div>
            <Button size="lg" block className="mt-5" onClick={() => start(due)}>
              Review {plural(batch, "card", "cards")} <IconArrowRight size={20} />
            </Button>
          </>
        ) : seen.length > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok">
                <IconCheck size={28} strokeWidth={2.6} />
              </div>
              <div>
                <p className="font-display text-[26px] leading-tight">{t("All caught up", "Tutto in ordine")}</p>
                <p className="text-[14px] text-ink-2">
                  {t("Nothing due.", "All caught up.")}{nextDue && <span className="text-ink-3"> Next card due {fromNow(nextDue - now)}.</span>}
                </p>
              </div>
            </div>
            <Button size="lg" variant="secondary" block className="mt-5" onClick={practiceAll}>
              Practice weakest cards anyway
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper-2 text-ink-3">
                <IconTrain size={26} />
              </div>
              <div>
                <p className="font-display text-[26px] leading-tight">{t("Nothing yet", "Niente ancora")}</p>
                <p className="text-[14px] text-ink-2">Finish a stop and its cards show up here.</p>
              </div>
            </div>
            <ButtonLink href="/" size="lg" block className="mt-5">
              Go to the journey <IconArrowRight size={20} />
            </ButtonLink>
          </>
        )}
      </motion.div>

      {ready && added.length > 0 && (
        <PhrasebookCard fresh={newAdded} total={added.length} primary={due.length === 0} onStart={practiceAdded} />
      )}

      {ready && <YourRules added={added} progress={progress} />}

      {completedLessons.length > 0 && (
        <motion.section layout="position" className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Practice one stop</h2>
          {lines.map((line) => {
            const done = line.lessons.filter((l) => completedLessons.includes(l));
            if (!done.length) return null;
            return (
              <div key={line.id} className="space-y-2">
                <p className="text-[13px] text-ink-3 italic">{line.it}</p>
                <div className="flex flex-wrap gap-2">
                  {done.map((l) => (
                    <motion.button
                      key={l.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => start(shuffle(allItems.filter((i) => i.lesson.id === l.id).map((i) => i.id)))}
                      className="h-11 rounded-full border border-line bg-card px-4 font-display text-[16px] text-ink-2 transition-colors hover:border-ink-3/50 hover:text-ink"
                    >
                      {l.city}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.section>
      )}
    </div>
  );
}

/** The learner's own entries as cards: new ones first, then the weakest. */
function PhrasebookCard({
  fresh,
  total,
  primary,
  onStart,
}: {
  fresh: AddedPhrase[];
  total: number;
  primary: boolean;
  onStart: () => void;
}) {
  const t = useT();
  const n = fresh.length;
  const batch = Math.min(n, NEW_ADDED);
  return (
    <motion.section layout="position" aria-labelledby="from-phrasebook" className="rounded-[22px] border border-line bg-card p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-bridge-soft text-bridge">
          <IconBook size={26} />
        </div>
        <div className="min-w-0">
          <h2 id="from-phrasebook" className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">
            {t("From your phrasebook", "Dal tuo frasario")}
          </h2>
          <p className="mt-1 font-display text-[24px] leading-tight text-ink">
            {n > 0
              ? t(`${n} new to learn`, `${n} ${n === 1 ? "nuova" : "nuove"} da imparare`)
              : t(`${plural(total, "entry", "entries")} to keep fresh`, `${total} da ripassare`)}
          </p>
        </div>
      </div>
      {n > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t("New entries", "Le nuove")}>
          {fresh.slice(0, 3).map((p) => (
            <li key={p.id} lang="it" className="max-w-full truncate rounded-full bg-paper-2 px-3 py-1 text-[14px] font-medium text-ink-2">
              {p.it}
            </li>
          ))}
          {n > 3 && <li className="px-1 py-1 text-[14px] text-ink-3">+{n - 3}</li>}
        </ul>
      )}
      <Button size="lg" variant={primary ? "primary" : "secondary"} block className="mt-5" onClick={onStart}>
        {n > 0
          ? t(`Learn ${plural(batch, "new one", "new ones")}`, `Impara ${batch === 1 ? "la nuova" : `le ${batch} nuove`}`)
          : t("Practice your phrasebook", "Ripassa il frasario")}
        <IconArrowRight size={20} />
      </Button>
    </motion.section>
  );
}

/**
 * The course rules behind what the learner adds: each card that teaches a
 * structure their entries use, with a couple of them as examples. Opens the
 * lesson right on that card.
 */
function YourRules({ added, progress }: { added: AddedPhrase[]; progress: Snapshot }) {
  const t = useT();
  const groups = useMemo(
    () =>
      [...byRule(added)]
        .flatMap(([id, entries]) => {
          const rule = ruleById.get(id);
          return rule ? [{ rule, entries }] : [];
        })
        // Most entries first; the sort is stable, so ties keep the newest first.
        .sort((a, b) => b.entries.length - a.entries.length)
        .slice(0, RULES_SHOWN),
    [added],
  );
  if (!groups.length) return null;
  return (
    <motion.section layout="position" className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">
          {t("The rules behind your phrases", "Le regole delle tue frasi")}
        </h2>
        <p className="text-[14px] leading-snug text-ink-2">
          {t("What you looked up, and the card that teaches how it works.", "Quello che hai cercato, e la carta che spiega come funziona.")}
        </p>
      </div>
      <ul className="space-y-2">
        {groups.map(({ rule, entries }) => (
          <li key={rule.id}>
            <Link
              href={ruleHref(rule, "/review")}
              className="group flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-card transition-[border-color,scale] hover:border-ink-3/40 active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] font-bold tracking-[0.14em] text-ink-3 uppercase">
                    {rule.lesson.city} · {rule.lesson.title}
                  </span>
                  {!progress.lessons[rule.lesson.id]?.completedAt && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                      {t("New", "Nuova")}
                    </span>
                  )}
                </span>
                <span className="block font-display text-[19px] leading-snug text-ink text-balance">
                  <Rich text={rule.title} speakable={false} />
                </span>
                <span className="block space-y-0.5">
                  {entries.slice(0, 2).map((p) => (
                    <span key={p.id} lang="it" className="block truncate text-[14.5px] text-ink-2 italic">
                      {p.it}
                    </span>
                  ))}
                  {entries.length > 2 && (
                    <span className="block text-[13px] text-ink-3">
                      {t(`and ${entries.length - 2} more of yours`, `e altre ${entries.length - 2} tue`)}
                    </span>
                  )}
                </span>
              </span>
              <IconArrowRight size={18} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function ResultCard({ result }: { result: SessionResult }) {
  const pct = result.firstTryCorrect / result.exercises;
  const r = 22;
  const c = 2 * Math.PI * r;
  const t = useT();
  const verdict =
    pct === 1
      ? t("Perfect!", "Perfetto!")
      : pct >= 0.75
        ? t("Nice work!", "Bravo!")
        : pct >= 0.5
          ? t("Done!", "Fatto!")
          : t("Almost there", "Ci siamo quasi");
  const line =
    pct === 1
      ? "Every card right on the first try."
      : pct >= 0.5
        ? "The misses come back sooner, so they stick."
        : "Tricky set. The misses come back soon for another go.";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex items-center gap-4 rounded-[22px] bg-ok-soft p-4 pr-5"
      role="status"
    >
      <div className="relative grid size-16 shrink-0 place-items-center">
        <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-ok/20" />
          <motion.circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-ok"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          />
        </svg>
        <span className="font-mono text-[13px] font-bold text-ok tabular-nums">
          {result.firstTryCorrect}/{result.exercises}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-display text-[24px] leading-tight text-ink italic">{verdict}</p>
        <p className="text-[14px] leading-snug text-ink-2">{line}</p>
      </div>
    </motion.div>
  );
}
