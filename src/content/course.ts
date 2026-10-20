import { lesson as amalfi } from "./lessons/amalfi";
import { lesson as bologna } from "./lessons/bologna";
import { lesson as firenze } from "./lessons/firenze";
import { lesson as lecce } from "./lessons/lecce";
import { lesson as milano } from "./lessons/milano";
import { lesson as napoli } from "./lessons/napoli";
import { lesson as palermo } from "./lessons/palermo";
import { lesson as roma } from "./lessons/roma";
import { lesson as siena } from "./lessons/siena";
import { lesson as venezia } from "./lessons/venezia";
import { lesson as verona } from "./lessons/verona";
import { trip } from "./trip";
import { isExercise, type ExerciseStep, type Lesson } from "./types";

/** The grammar course, north to south. Order is the suggested path, not a lock. */
export const course: Lesson[] = [milano, verona, venezia, bologna, firenze, siena, roma, napoli, amalfi, lecce, palermo];

export type LineId = "corso" | "viaggio";

/** A line is an ordered set of lessons shown as one track on the home screen. */
export interface Line {
  id: LineId;
  /** Italian name, shown on the switch. */
  it: string;
  /** Short English name, for the line switch. */
  short: string;
  en: string;
  lessons: Lesson[];
}

export const lines: Line[] = [
  { id: "corso", it: "Il corso", short: "Course", en: "Grammar & sounds", lessons: course },
  { id: "viaggio", it: "Il mio viaggio", short: "My trip", en: "Phrases for each stop of the trip", lessons: trip },
];

export const allLessons: Lesson[] = lines.flatMap((l) => l.lessons);

export const lessonById = (id: string) => allLessons.find((l) => l.id === id);

export const lineOf = (lessonId: string): Line => lines.find((l) => l.lessons.some((x) => x.id === lessonId)) ?? lines[0];

export const itemId = (lessonId: string, stepId: string) => `${lessonId}/${stepId}`;

export interface CourseItem {
  id: string;
  lesson: Lesson;
  step: ExerciseStep;
}

/** Every exercise on every line, addressable for spaced repetition. */
export const allItems: CourseItem[] = allLessons.flatMap((lesson) =>
  lesson.steps.filter(isExercise).map((step) => ({ id: itemId(lesson.id, step.id), lesson, step })),
);

export const itemById = new Map(allItems.map((i) => [i.id, i]));
