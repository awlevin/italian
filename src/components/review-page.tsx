"use client";

import { Review } from "./review";
import { Shell } from "./shell";

export function ReviewPage() {
  return <Review shell={(c) => <Shell>{c}</Shell>} />;
}
