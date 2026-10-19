import { plain } from "@/lib/text";
import { allLessons } from "./course";
import type { Lesson } from "./types";

/** A card that teaches something: a rule an added phrase can point back to. */
export interface Rule {
  /** "<lessonId>/<stepId>", like an item id. */
  id: string;
  lesson: Lesson;
  stepId: string;
  title: string;
  /** The rule in one line, plain text. */
  gist: string;
}

const firstSentence = (s: string) => plain(s).match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? plain(s);

/** Every teach and morph card on both lines, in course order. */
export const rules: Rule[] = allLessons.flatMap((lesson) =>
  lesson.steps.flatMap((s) =>
    s.kind === "teach" || s.kind === "morph"
      ? [
          {
            id: `${lesson.id}/${s.id}`,
            lesson,
            stepId: s.id,
            title: s.title,
            gist: s.kind === "morph" ? plain(s.rule) : firstSentence(s.body),
          },
        ]
      : [],
  ),
);

export const ruleById = new Map(rules.map((r) => [r.id, r]));

/** Opens the lesson on the card that teaches the rule; leaving it goes back to `back`. */
export const ruleHref = (r: Rule, back: string) =>
  `/lesson/${r.lesson.id}?step=${encodeURIComponent(r.stepId)}&back=${encodeURIComponent(back)}`;
