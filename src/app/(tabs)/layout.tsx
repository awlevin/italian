import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";

/** The three tabs share one header and tab bar, so switching tabs only swaps the content. */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
