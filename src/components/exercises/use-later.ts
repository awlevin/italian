import { useCallback, useEffect, useRef } from "react";

/** Schedules a callback that is cancelled if the card unmounts first (e.g. speech after the answer chime). */
export function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
}

/** Lets the answer chime finish before Italian audio starts. */
export const AFTER_CHIME_MS = 380;
