/**
 * Small helpers shared by the Memory Kingdom mechanics (generic enough to move into
 * src/games/shared later).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { MemorizeBar } from '@/games/shared';

/**
 * A timeout that freezes while `paused` and resumes with the remaining time.
 * Runs while `active`; changing `resetKey` restarts it with the full `ms`.
 * Returns the remaining ms at the last (re)start — handy for MemorizeBar.
 */
export function usePausableTimeout(opts: {
  active: boolean;
  paused: boolean;
  ms: number;
  resetKey: string | number;
  onDone: () => void;
}): number {
  const { active, paused, ms, resetKey } = opts;
  const remaining = useRef(ms);
  const keyRef = useRef<string | number | null>(null);
  const cb = useRef(opts.onDone);
  cb.current = opts.onDone;
  const [left, setLeft] = useState(ms);

  useEffect(() => {
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey;
      remaining.current = ms;
    }
    if (!active || paused) return;
    let fired = false;
    const start = Date.now();
    setLeft(remaining.current);
    const id = setTimeout(() => {
      fired = true;
      remaining.current = ms;
      cb.current();
    }, remaining.current);
    return () => {
      clearTimeout(id);
      if (!fired) remaining.current = Math.max(0, remaining.current - (Date.now() - start));
    };
  }, [active, paused, resetKey, ms]);

  return left;
}

/** Fixed-height slot for the "Remember!" bar so the layout does not jump between phases. */
export function MemorizeSlot({ running, durationMs, label }: { running: boolean; durationMs: number; label?: string }) {
  return (
    <View style={{ height: 56, justifyContent: 'center' }}>
      <MemorizeBar running={running} durationMs={durationMs} label={label} />
    </View>
  );
}

export const MEMO_SLOT_H = 56;
