"use client";

import { MotionConfig } from "motion/react";
import { ProgressProvider } from "./progress/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ProgressProvider>{children}</ProgressProvider>
    </MotionConfig>
  );
}
