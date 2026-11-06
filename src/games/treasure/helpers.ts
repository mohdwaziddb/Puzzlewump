/** Small generic hooks used by every Treasure Island mechanic. */
import { useCallback, useRef } from 'react';

/** Wraps onSolved so it can only ever fire once. */
export function useSolveOnce(onSolved: () => void) {
  const done = useRef(false);
  const cb = useRef(onSolved);
  cb.current = onSolved;
  return useCallback(() => {
    if (done.current) return;
    done.current = true;
    cb.current();
  }, []);
}

/** onMistake that ignores rapid double taps (gentle on little fingers). */
export function useGentleMistake(onMistake: () => void, gapMs = 600) {
  const last = useRef(0);
  const cb = useRef(onMistake);
  cb.current = onMistake;
  return useCallback(() => {
    const now = Date.now();
    if (now - last.current < gapMs) return false;
    last.current = now;
    cb.current();
    return true;
  }, [gapMs]);
}

/** Stable dependency key for params objects. */
export const paramsKey = (p: unknown) => JSON.stringify(p ?? {});
