import { AuthGate } from "@/components/auth-gate";
import { Journey } from "@/components/journey";
import { Shell } from "@/components/shell";

export default function Home() {
  return (
    <AuthGate>
      <Shell>
        <Journey />
      </Shell>
    </AuthGate>
  );
}
