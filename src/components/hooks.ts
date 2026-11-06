/**
 * Small shared hooks for menu screens.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';

/** Plays the main menu music whenever the screen gains focus. */
export function useMenuMusic() {
  useFocusEffect(
    useCallback(() => {
      AudioService.playMusic('main');
    }, []),
  );
}

/** Gentle horizontal "no-no" shake. Returns the animated style and a trigger. */
export function useShake(distance = 8) {
  const x = useSharedValue(0);
  useEffect(() => () => cancelAnimation(x), [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = useCallback(
    (withSound = true) => {
      if (withSound) AudioService.play('wrong');
      vibrate('error');
      x.value = withSequence(
        withTiming(-distance, { duration: 50 }),
        withTiming(distance, { duration: 70 }),
        withTiming(-distance * 0.7, { duration: 70 }),
        withTiming(distance * 0.5, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      );
    },
    [x, distance],
  );
  return { style, shake };
}

/** setTimeout that is automatically cleared on unmount. */
export function useSafeTimeouts() {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      ids.current.forEach(clearTimeout);
      ids.current = [];
    },
    [],
  );
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      ids.current = ids.current.filter((x) => x !== id);
      fn();
    }, ms);
    ids.current.push(id);
    return id;
  }, []);
}

/** "1h 05m" / "12m" style duration for kids & parents. */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}
