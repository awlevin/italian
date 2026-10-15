"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { Example, Table as TableT, TeachStep } from "@/content/types";
import { IconBridge, IconChevronDown } from "@/components/ui/icons";
import { Rich } from "@/components/ui/rich";
import { SpeakButton } from "@/components/ui/speak-button";

export function ExampleRow({ ex, i = 0 }: { ex: Example; i?: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + i * 0.06 }}
      className="flex items-start gap-3 py-3"
    >
      <SpeakButton text={ex.it} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p lang="it" className="text-[17px] leading-snug font-semibold text-ink">
          {ex.it}
        </p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink-2">
          {ex.en}
          {ex.es && (
            <span className="text-bridge">
              {" "}
              · <span className="italic">{ex.es}</span>
            </span>
          )}
        </p>
        {ex.note && <p className="mt-1 text-[13px] leading-snug text-ink-3"><Rich text={ex.note} /></p>}
      </div>
    </motion.li>
  );
}

export function DataTable({ table }: { table: TableT }) {
  return (
    <figure className="space-y-2">
      {table.caption && <figcaption className="text-[13px] text-ink-3">{table.caption}</figcaption>}
      {/* Wide tables scroll inside their own frame, never the page. */}
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table className="w-full border-separate border-spacing-0 text-left text-[14.5px]">
          <thead>
            <tr>
              {table.head.map((h, i) => (
                <th
                  key={i}
                  className="border-b-2 border-line py-1.5 pr-4 font-mono text-[11px] font-bold tracking-[0.1em] whitespace-nowrap text-ink-3 uppercase last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`border-b border-line/70 py-2.5 pr-4 align-top leading-snug last:pr-0 [&_.it-mark]:whitespace-nowrap ${
                      j === 0 ? "min-w-[5.5rem] text-ink-2" : "text-ink"
                    }`}
                  >
                    <Rich text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-bridge-soft px-4 py-3 text-[15px] leading-snug text-ink">
      <IconBridge size={20} className="mt-0.5 shrink-0 text-bridge" />
      <p>
        <span className="font-semibold text-bridge">From Spanish: </span>
        <Rich text={text} />
      </p>
    </div>
  );
}

export function More({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  return (
    <div ref={box} className="scroll-mt-20 scroll-mb-32 rounded-2xl border border-line bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-ink-2 hover:text-ink"
      >
        <span>
          <Rich text={label} speakable={false} />
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-2 text-ink-3"
        >
          <IconChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => open && box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 text-[15.5px] leading-relaxed text-ink-2 text-pretty">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Body copy split into paragraphs on blank lines. */
function Paragraphs({ text, className }: { text: string; className?: string }) {
  return text
    .split(/\n\s*\n/)
    .map((p, i) => (
      <p key={i} className={className}>
        <Rich text={p.trim()} />
      </p>
    ));
}

export function Teach({ step }: { step: TeachStep }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-accent uppercase">New</p>
        <h2 className="font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">
          <Rich text={step.title} speakable={false} />
        </h2>
        <Paragraphs text={step.body} className="text-[17px] leading-relaxed text-ink-2 text-pretty" />
      </div>
      {step.tip && <Tip text={step.tip} />}
      {step.examples && step.examples.length > 0 && (
        <ul className="divide-y divide-line/70 border-y border-line/70">
          {step.examples.map((ex, i) => (
            <ExampleRow key={i} ex={ex} i={i} />
          ))}
        </ul>
      )}
      {step.table && <DataTable table={step.table} />}
      {step.more && (
        <More label={step.more.label}>
          <Paragraphs text={step.more.body} />
          {step.more.table && <DataTable table={step.more.table} />}
        </More>
      )}
    </div>
  );
}
