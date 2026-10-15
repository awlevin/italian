"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
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
            <span className="text-sea">
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
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left text-[14.5px]">
        {table.caption && <caption className="mb-2 text-left text-[13px] text-ink-3">{table.caption}</caption>}
        <thead>
          <tr>
            {table.head.map((h, i) => (
              <th key={i} className="border-b-2 border-line px-2 pb-1.5 font-mono text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`border-b border-line/70 px-2 py-2 align-top ${j === 0 ? "text-ink-2" : "text-ink"}`}>
                  <Rich text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-sea-soft px-4 py-3 text-[15px] leading-snug text-ink">
      <IconBridge size={20} className="mt-0.5 shrink-0 text-sea" />
      <p>
        <span className="font-semibold text-sea">From Spanish: </span>
        <Rich text={text} />
      </p>
    </div>
  );
}

export function More({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-semibold text-ink-2 hover:text-ink"
      >
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
          <IconChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 text-[15.5px] leading-relaxed text-ink-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Teach({ step }: { step: TeachStep }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-accent uppercase">New</p>
        <h2 className="font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">{step.title}</h2>
        <p className="text-[17px] leading-relaxed text-ink-2 text-pretty">
          <Rich text={step.body} />
        </p>
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
          <p>
            <Rich text={step.more.body} />
          </p>
          {step.more.table && <DataTable table={step.more.table} />}
        </More>
      )}
    </div>
  );
}
