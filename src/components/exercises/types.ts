export type Phase = "answering" | "correct" | "wrong";

export interface Verdict {
  correct: boolean;
  /** Canonical answer, shown when wrong. */
  answer?: string;
  /** Extra nudge, e.g. an accent slip on an otherwise right answer. */
  note?: string;
}

export interface ExerciseProps<S> {
  step: S;
  phase: Phase;
  /** Register a grader once the learner has an answer ready (enables "Check"). */
  setGrader: (grade: (() => Verdict) | null) => void;
  /** Self-graded exercises (tap to answer) report directly. */
  submit: (v: Verdict) => void;
}
