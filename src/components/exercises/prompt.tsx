import { Rich } from "@/components/ui/rich";

/** Small caps eyebrow + prompt line shared by every exercise. */
export function Prompt({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">{eyebrow}</p>
      <h2 className="text-[19px] leading-snug font-medium text-ink-2 text-balance">
        <Rich text={text} />
      </h2>
    </div>
  );
}

/** An Italian sentence with an optional ___ blank, set large in the display face. */
export function Sentence({ text, fill, state }: { text: string; fill?: string; state?: "correct" | "wrong" | "empty" }) {
  const [before, after] = text.split("___");
  const hasBlank = after !== undefined;
  return (
    <p lang="it" className="font-display text-[28px] leading-[1.25] tracking-[-0.01em] text-ink text-balance">
      <Rich text={before} speakable={false} />
      {hasBlank && (
        <>
          <span
            className={`mx-1 inline-block min-w-[3.2ch] border-b-[3px] px-1 text-center transition-colors duration-300 ${
              state === "correct"
                ? "border-olive text-olive"
                : state === "wrong"
                  ? "border-wrong text-wrong"
                  : "border-ink-3/60 text-ink-3"
            }`}
          >
            {fill ?? " "}
          </span>
          <Rich text={after} speakable={false} />
        </>
      )}
    </p>
  );
}
