"use client";

import type { Step } from "@/content/types";
import { Build } from "@/components/exercises/build";
import { Choice, Listen } from "@/components/exercises/choice";
import { Match } from "@/components/exercises/match";
import { Morph } from "@/components/exercises/morph";
import { Teach } from "@/components/exercises/teach";
import { TypeAnswer } from "@/components/exercises/type";
import type { Phase, Verdict } from "@/components/exercises/types";

export function StepView({
  step,
  phase,
  setGrader,
  submit,
}: {
  step: Step;
  phase: Phase;
  setGrader: (g: (() => Verdict) | null) => void;
  submit: (v: Verdict) => void;
}) {
  const p = { phase, setGrader, submit };
  switch (step.kind) {
    case "teach":
      return <Teach step={step} />;
    case "morph":
      return <Morph step={step} />;
    case "choice":
      return <Choice step={step} {...p} />;
    case "listen":
      return <Listen step={step} {...p} />;
    case "type":
      return <TypeAnswer step={step} {...p} />;
    case "build":
      return <Build step={step} {...p} />;
    case "match":
      return <Match step={step} {...p} />;
  }
}
