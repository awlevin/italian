import { AuthGate } from "@/components/auth-gate";
import { ReviewPage } from "@/components/review-page";

export const metadata = { title: "Ripasso" };

export default function Page() {
  return (
    <AuthGate>
      <ReviewPage />
    </AuthGate>
  );
}
