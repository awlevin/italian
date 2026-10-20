"use client";

import Link from "next/link";
import { grammar } from "@/content/grammar";
import { ruleById, ruleHref } from "@/content/rules";
import { useT } from "@/lib/locale";
import { DataTable } from "./exercises/teach";
import { Rich } from "./ui/rich";
import { IconArrowLeft, IconArrowRight } from "./ui/icons";

const HERE = "/phrasebook/grammar";

/** Every conjugation and pronoun table on one page, to look up after the lessons. */
export function Grammar() {
  const t = useT();
  return (
    <div className="pt-2">
      <Link href="/phrasebook" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[14px] font-semibold text-ink-2">
        <IconArrowLeft size={16} />
        {t("Phrasebook", "Frasario")}
      </Link>
      <div className="space-y-1.5 pb-4">
        <h1 className="font-display-wonk text-[44px] leading-none tracking-[-0.03em]">{t("Grammar", "Grammatica")}</h1>
        <p className="text-[16px] text-ink-2">{t("Pronouns and verb tables in one place. Tap any Italian to hear it.", "Pronomi e verbi in un posto solo. Tocca l'italiano per ascoltarlo.")}</p>
      </div>

      <nav aria-label={t("Sections", "Sezioni")} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {grammar.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="flex h-9 shrink-0 items-center rounded-full border border-line bg-card px-3.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            {g.it}
          </a>
        ))}
      </nav>

      <div className="space-y-9 pt-4">
        {grammar.map((g) => {
          const rule = g.rule ? ruleById.get(g.rule) : undefined;
          return (
            <section key={g.id} id={g.id} className="scroll-mt-4 space-y-4">
              <div className="space-y-2">
                <h2 className="flex items-baseline gap-2 border-b border-line pb-2">
                  <span className="font-display text-[24px] italic">{g.it}</span>
                  <span className="text-[13px] text-ink-3">{g.title}</span>
                </h2>
                <p className="text-[15px] leading-snug text-ink-2">
                  <Rich text={g.body} />
                </p>
              </div>
              {g.tables.map((table, i) => (
                <DataTable key={i} table={table} />
              ))}
              {g.notes && (
                <ul className="space-y-1.5 text-[14px] leading-snug text-ink-2">
                  {g.notes.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>
                        <Rich text={n} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {rule && (
                <Link href={ruleHref(rule, HERE)} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-accent">
                  {t(`Learn it in ${rule.lesson.city}`, `Impara a ${rule.lesson.city}`)}
                  <IconArrowRight size={15} className="shrink-0" />
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
