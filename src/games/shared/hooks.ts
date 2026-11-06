/** Shared hooks for every mechanic. Use these instead of rolling your own. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { createRng, type Rng } from '@/engine/rng';

/** Memoized deterministic RNG for this puzzle (re-created only when seed changes). */
export function useRng(seed: number, salt = 0): Rng {
  return useMemo(() => createRng(seed + salt * 7919), [seed, salt]);
}

/** Build puzzle data once per seed+params. `factory` receives a fresh RNG. */
export function usePuzzle<T>(seed: number, factory: (rng: Rng) => T, deps: unknown[] = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(createRng(seed)), [seed, ...deps]);
}

/** Runs `onHint` every time hintSignal increases (not on mount). */
export function useHintEffect(hintSignal: number, onHint: () => void) {
  const last = useRef(hintSignal);
  const cb = useRef(onHint);
  cb.current = onHint;
  useEffect(() => {
    if (hintSignal > last.current) cb.current();
    last.current = hintSignal;
  }, [hintSignal]);
}

/**
 * setTimeout that is automatically cleared on unmount.
 * Returned `later(fn, ms)` returns a cancel function; `clearAll()` cancels everything.
 */
export function useTimers() {
  const ids = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = ids.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
    return () => {
      clearTimeout(id);
      ids.current.delete(id);
    };
  }, []);
  const clearAll = useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current.clear();
  }, []);
  return { later, clearAll };
}

/** Friendly wrong-answer wiggle. Call `shake()`; apply `shakeStyle` to an Animated.View. */
export function useShake() {
  const x = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = useCallback(() => {
    x.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 70 }),
      withTiming(-7, { duration: 60 }),
      withTiming(7, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  }, [x]);
  return { shake, shakeStyle };
}

/** Happy pop for correct answers. Apply `popStyle`; call `pop()`. */
export function usePop() {
  const s = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const pop = useCallback(() => {
    s.value = withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, { damping: 6 }));
  }, [s]);
  return { pop, popStyle };
}

/**
 * Multi-round helper (e.g. "answer 5 sums"). Reports progress to the host and calls
 * onSolved after the last round.
 */
export function useRounds(
  total: number,
  opts: { onSolved: () => void; onProgress?: (f: number) => void; delayMs?: number },
) {
  const [round, setRound] = useState(0);
  const { later } = useTimers();
  const doneRef = useRef(false);
  const next = useCallback(() => {
    const nr = round + 1;
    opts.onProgress?.(nr / total);
    if (nr >= total) {
      if (!doneRef.current) {
        doneRef.current = true;
        later(() => opts.onSolved(), opts.delayMs ?? 450);
      }
      return;
    }
    later(() => setRound(nr), opts.delayMs ?? 450);
  }, [round, total, opts, later]);
  return { round, total, next, isLast: round === total - 1 };
}

/** Square cell size that fits a rows x cols board in width x height with a gap. */
export function cellSize(width: number, height: number, rows: number, cols: number, gap = 8, max = 120): number {
  const w = (width - gap * (cols - 1)) / cols;
  const h = (height - gap * (rows - 1)) / rows;
  return Math.max(16, Math.floor(Math.min(w, h, max)));
}
