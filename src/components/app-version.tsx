/** The running version, barely there: for checking which release a phone has. */
export function AppVersion() {
  return (
    <p className="pt-2 text-center font-mono text-[10px] tracking-wide text-ink-3/50 select-all">
      v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_COMMIT}
    </p>
  );
}
