import { lesson as amalfi } from "./lessons/amalfi";
import { lesson as bologna } from "./lessons/bologna";
import { lesson as firenze } from "./lessons/firenze";
import { lesson as milano } from "./lessons/milano";
import { lesson as napoli } from "./lessons/napoli";
import { lesson as palermo } from "./lessons/palermo";
import { lesson as roma } from "./lessons/roma";
import { lesson as siena } from "./lessons/siena";
import { lesson as venezia } from "./lessons/venezia";
import { lesson as verona } from "./lessons/verona";
import { isExercise, type ExerciseStep, type Lesson } from "./types";

/** The journey, north to south. Order is the suggested path, not a lock. */
export const course: Lesson[] = [milano, verona, venezia, bologna, firenze, siena, roma, napoli, amalfi, palermo];

export const lessonById = (id: string) => course.find((l) => l.id === id);

export const itemId = (lessonId: string, stepId: string) => `${lessonId}/${stepId}`;

export interface CourseItem {
  id: string;
  lesson: Lesson;
  step: ExerciseStep;
}

/** Every exercise in the course, addressable for spaced repetition. */
export const allItems: CourseItem[] = course.flatMap((lesson) =>
  lesson.steps.filter(isExercise).map((step) => ({ id: itemId(lesson.id, step.id), lesson, step })),
);

export const itemById = new Map(allItems.map((i) => [i.id, i]));
