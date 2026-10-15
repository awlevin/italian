"use client";

import { UserButton } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { allItems } from "@/content/course";
import { dueItemIds } from "@/lib/stats";
import { useProgress, useSyncStatus } from "./progress/provider";
import { IconBook, IconCloud, IconRepeat, IconTrain } from "./ui/icons";

function SyncBadge() {
  const status = useSyncStatus();
  const label =
    status === "saving" ? "Saving…" : status === "offline" ? "Offline · saved on device" : status === "error" ? "Retrying…" : status === "saved" ? "Saved" : null;

  return (
    <AnimatePresence>
      {label && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: -4 }}
          // "Saved" flashes, then fades on its own.
          animate={status === "saved" ? { opacity: [0, 1, 1, 0], y: 0 } : { opacity: 1, y: 0 }}
          transition={status === "saved" ? { duration: 2, times: [0, 0.1, 0.75, 1] } : undefined}
          exit={{ opacity: 0 }}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
            status === "offline" || status === "error" ? "bg-lemon-soft text-ink-2" : "text-ink-3"
          }`}
          role="status"
        >
          <IconCloud size={14} />
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

const TABS = [
  { href: "/", label: "Viaggio", Icon: IconTrain },
  { href: "/review", label: "Ripasso", Icon: IconRepeat },
  { href: "/phrasebook", label: "Frasario", Icon: IconBook },
] as const;

function TabBar() {
  const path = usePathname();
  const progress = useProgress();
  const known = new Set(allItems.map((i) => i.id));
  const due = dueItemIds(progress).filter((id) => known.has(id)).length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex gap-1 rounded-full border border-line bg-card/90 p-1.5 shadow-lift backdrop-blur-xl">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                active ? "text-accent-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icon size={18} className="relative" />
              <span className="relative">{label}</span>
              {href === "/review" && due > 0 && (
                <span
                  className={`relative grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[11px] font-bold ${
                    active ? "bg-accent-ink text-accent" : "bg-accent text-accent-ink"
                  }`}
                >
                  {due > 99 ? "99+" : due}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-dvh">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-2">
        <Link href="/" className="font-display text-[24px] italic tracking-[-0.01em] text-ink">
          Ponte
        </Link>
        <div className="flex items-center gap-2">
          <SyncBadge />
          <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 pb-32">{children}</main>
      <TabBar />
    </div>
  );
}
