import { Suspense } from "react";
import { AuthGate, Splash } from "@/components/auth-gate";
import { ReviewPage } from "@/components/review-page";

export const metadata = { title: "Review" };

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <AuthGate>
        <ReviewPage />
      </AuthGate>
    </Suspense>
  );
}
