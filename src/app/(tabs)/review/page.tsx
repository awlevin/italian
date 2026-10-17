import { Suspense } from "react";
import { Review } from "@/components/review";

export const metadata = { title: "Review" };

export default function Page() {
  // Review reads the URL (?s=1 while a session runs), which needs a Suspense boundary.
  return (
    <Suspense>
      <Review />
    </Suspense>
  );
}
