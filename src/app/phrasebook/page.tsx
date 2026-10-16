import { AuthGate } from "@/components/auth-gate";
import { Phrasebook } from "@/components/phrasebook";
import { Shell } from "@/components/shell";

export const metadata = { title: "Phrasebook" };

export default function Page() {
  return (
    <AuthGate>
      <Shell>
        <Phrasebook />
      </Shell>
    </AuthGate>
  );
}
