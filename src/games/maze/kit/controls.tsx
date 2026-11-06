/**
 * Movement controls shared by the grid-walking jungle games (maze, push puzzle):
 *  - DPad        big on-screen arrow buttons (IconButton from the shared UI kit), optional side slots
 *  - SwipeArea   swipe anywhere on the board to move (react-native-gesture-handler pan)
 *  - useGentleMistake  rate-limited onMistake for bumps so kids are not punished for spamming
 */
import React, { useCallback, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { IconButton } from '@/components/ui';
import type { Dir } from '../generators';
import { ArrowIcon } from './art';

export const DPAD_HEIGHT = (btn: number) => btn * 2 + 18;

export function DPad({
  onDir,
  size = 60,
  disabled,
  left,
  right,
}: {
  onDir: (d: Dir) => void;
  /** button diameter */
  size?: number;
  disabled?: boolean;
  /** optional content beside the pad (e.g. Undo / Reset) */
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const btn = (d: Dir) => (
    <IconButton size={size} variant="green" onPress={() => onDir(d)} disabled={disabled} sound={null}>
      <ArrowIcon dir={d} size={size * 0.56} stroke="#24800E" />
    </IconButton>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <View style={{ minWidth: size, alignItems: 'center' }}>{left}</View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        {btn('U')}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {btn('L')}
          {btn('D')}
          {btn('R')}
        </View>
      </View>
      <View style={{ minWidth: size, alignItems: 'center' }}>{right}</View>
    </View>
  );
}

/** Wraps the board: a swipe (any length > 18px) calls onSwipe with the dominant direction. */
export function SwipeArea({
  onSwipe,
  enabled = true,
  children,
  style,
}: {
  onSwipe: (d: Dir) => void;
  enabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const cb = useRef(onSwipe);
  cb.current = onSwipe;
  const pan = usePanGesture({
    runOnJS: true,
    enabled,
    minDistance: 14,
    onDeactivate: (e) => {
      const tx = e.translationX;
      const ty = e.translationY;
      if (Math.max(Math.abs(tx), Math.abs(ty)) < 18) return;
      cb.current(Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 'R' : 'L') : ty > 0 ? 'D' : 'U');
    },
  });
  return (
    <GestureDetector gesture={pan}>
      <View style={style} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

/**
 * Gentle mistakes: calls onMistake at most once per `cooldownMs` (bumping a wall repeatedly
 * costs one heart, not five). Pass enabled=false to never count (beginner levels).
 */
export function useGentleMistake(onMistake: () => void, enabled: boolean, cooldownMs = 2000) {
  const last = useRef(-Infinity);
  const cb = useRef(onMistake);
  cb.current = onMistake;
  return useCallback(() => {
    if (!enabled) return false;
    const now = Date.now();
    if (now - last.current < cooldownMs) return false;
    last.current = now;
    cb.current();
    return true;
  }, [enabled, cooldownMs]);
}
