"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { itemById } from "@/content/course";
import { useOnline } from "@/lib/offline";
import { dueItemIds } from "@/lib/stats";
import type { SyncStatus } from "./progress/store";
import { useProgress, useSyncStatus } from "./progress/provider";
import { IconBook, IconCloud, IconCloudCheck, IconCloudOff, IconDevice, IconRepeat, IconTrain } from "./ui/icons";
import { useT } from "@/lib/locale";

/**
 * Sync status with the jitter taken out: quick saves never show "Saving",
 * "Saved" appears only right after a save and then fades away.
 */
function useCalmStatus(status: SyncStatus): SyncStatus {
  const [shown, setShown] = useState<SyncStatus>(status === "offline" || status === "error" ? status : "idle");
  const prev = useRef(status);
  useEffect(() => {
    const from = prev.current;
    prev.current = status;
    if (from === status) return;
    const next = status === "saved" && from !== "saving" ? "idle" : status;
    const t = setTimeout(() => setShown(next), status === "saving" ? 800 : 0);
    const fade = status === "saved" ? setTimeout(() => setShown("idle"), 1800) : undefined;
    return () => {
      clearTimeout(t);
      clearTimeout(fade);
    };
  }, [status]);
  return shown;
}

const BADGE: Partial<Record<SyncStatus, { label: string; title: string; Icon: typeof IconCloud; tone: string }>> = {
  saving: { label: "Saving", title: "Saving your progress", Icon: IconCloud, tone: "text-ink-3" },
  saved: { label: "Saved", title: "Your progress is saved", Icon: IconCloudCheck, tone: "text-ok" },
  offline: {
    label: "Offline · saved on device",
    title: "No connection. Progress is kept on this phone and syncs when you are back online.",
    Icon: IconCloudOff,
    tone: "bg-mark-soft text-ink-2",
  },
  error: {
    label: "Saved on device",
    title: "Could not reach the server. Progress is kept on this phone and will sync automatically.",
    Icon: IconDevice,
    tone: "bg-paper-2 text-ink-2",
  },
};

function SyncBadge() {
  const synced = useSyncStatus();
  const status = useCalmStatus(useOnline() ? synced : "offline");
  const b = BADGE[status];
  return (
    <span role="status" aria-live="polite" className="flex min-w-0 justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {b && (
          <motion.span
            key={status}
            title={b.title}
            initial={{ opacity: 0, y: -4, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, filter: "blur(2px)" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`flex h-7 items-center gap-1.5 truncate rounded-full px-2.5 text-[12px] font-semibold ${b.tone}`}
          >
            {status === "saving" ? (
              <motion.span animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                <b.Icon size={15} />
              </motion.span>
            ) : (
              <b.Icon size={15} />
            )}
            {b.label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

const TABS = [
  { href: "/", en: "Lessons", it: "Lezioni", Icon: IconTrain },
  { href: "/review", en: "Review", it: "Ripasso", Icon: IconRepeat },
  { href: "/phrasebook", en: "Phrasebook", it: "Frasario", Icon: IconBook },
] as const;


// Full-screen moments inside a tab (a review session) hide the header and tab bar.
let chromeHidden = false;
const chromeListeners = new Set<() => void>();
const subscribeChrome = (fn: () => void) => {
  chromeListeners.add(fn);
  return () => void chromeListeners.delete(fn);
};

export function useHideChrome(hide: boolean) {
  useLayoutEffect(() => {
    if (!hide) return;
    chromeHidden = true;
    chromeListeners.forEach((l) => l());
    return () => {
      chromeHidden = false;
      chromeListeners.forEach((l) => l());
    };
  }, [hide]);
}

/** True while a text field has focus on a touch device (the keyboard is up). */
function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.matches("input:not([type=checkbox]):not([type=radio]), textarea") || el.isContentEditable);
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => isField(e.target) && !isField(e.relatedTarget) && setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}

function TabBar() {
  const path = usePathname();
  const progress = useProgress();
  const due = dueItemIds(progress).filter((id) => itemById.has(id)).length;
  const typing = useTyping();
  const t = useT();

  return (
    <motion.nav
      aria-label="Main"
      initial={false}
      animate={typing ? { y: "140%", opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex w-full max-w-[22rem] gap-1 rounded-full border border-line bg-card/85 p-1.5 shadow-lift backdrop-blur-xl backdrop-saturate-150">
        {TABS.map(({ href, en, it, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          const badge = href === "/review" && due > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-12 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold transition-[color,scale] duration-200 active:scale-[0.96] ${
                active ? "text-accent-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-accent shadow-[0_2px_0_var(--accent-press)]"
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                />
              )}
              <Icon size={18} className="relative shrink-0" />
              <span className="relative">{t(en, it)}</span>
              {badge && (
                <motion.span
                  key={due}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                  aria-label={`${due} due`}
                  className={`relative grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full px-1 font-mono text-[10px] leading-none font-bold ${
                    active ? "bg-accent-ink text-accent" : "bg-accent text-accent-ink"
                  }`}
                >
                  {due > 99 ? "99+" : due}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const hasPhoto = useUser().user?.hasImage ?? false;
  const hidden = useSyncExternalStore(subscribeChrome, () => chromeHidden, () => false);
  // The tree keeps its shape when the chrome hides, so the page underneath keeps its state.
  return (
    <div className={hidden ? undefined : "relative z-10 min-h-dvh"}>
      {!hidden && (
        <>
          {/* Home-screen app: content scrolling under the status bar gets a paper backdrop. */}
          <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-paper" />
          <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
            <Link href="/" className="-ml-1 rounded-lg px-1 font-display text-[24px] tracking-[-0.01em] text-ink italic">
              Ciao
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <SyncBadge />
              <span className="grid size-9 shrink-0 place-items-center">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-9 ring-2 ring-line bg-accent",
                      // Clerk's stock gradient avatar fights the palette: tint it to the accent.
                      avatarImage: hasPhoto ? "" : "mix-blend-luminosity opacity-70",
                      userButtonTrigger: "rounded-full",
                    },
                  }}
                />
              </span>
            </div>
          </header>
        </>
      )}
      <main className={hidden ? undefined : "mx-auto max-w-xl px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]"}>
        {children}
      </main>
      {!hidden && <TabBar />}
    </div>
  );
}
