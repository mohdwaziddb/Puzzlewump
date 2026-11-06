/**
 * Confetti rain: up to 40 pieces driven by ONE shared value, removes itself when done.
 * Change `burstKey` to fire again.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const COLORS = ['#FFC93C', '#FF5A5F', '#5DD43B', '#4AA8FF', '#9B6CF0', '#FF7EB6', '#FF8A3D', '#3DF5E0'];
const MAX_PIECES = 40;

interface Piece {
  x: number;
  drift: number;
  delay: number; // 0..0.35 of the timeline
  spin: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}

const ConfettiPiece = React.memo(function ConfettiPiece({ p, t, height }: { p: Piece; t: SharedValue<number>; height: number }) {
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, (t.value - p.delay) / (1 - p.delay)));
    return {
      opacity: local <= 0 || local >= 1 ? 0 : local > 0.85 ? (1 - local) / 0.15 : 1,
      transform: [
        { translateX: p.x + Math.sin(local * 6 + p.spin) * 18 + p.drift * local },
        { translateY: -30 + local * (height + 60) },
        { rotate: `${local * p.spin * 360}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.round ? p.w / 2 : 2 },
        style,
      ]}
    />
  );
});

export function Confetti({ burstKey = 0, count = 40, duration = 2800, onDone }: {
  burstKey?: number | string;
  count?: number;
  duration?: number;
  onDone?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  const [active, setActive] = useState(true);

  const pieces = useMemo<Piece[]>(() => {
    const n = Math.min(MAX_PIECES, count);
    return Array.from({ length: n }, (_, i) => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 80,
      delay: Math.random() * 0.35,
      spin: 1 + Math.random() * 3,
      w: 8 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      round: i % 4 === 0,
    }));
    // new random layout per burst
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, count, width]);

  useEffect(() => {
    setActive(true);
    t.value = 0;
    t.value = withTiming(1, { duration, easing: Easing.linear });
    const id = setTimeout(() => {
      setActive(false);
      onDone?.();
    }, duration + 50);
    return () => {
      clearTimeout(id);
      cancelAnimation(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, duration]);

  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} p={p} t={t} height={height} />
      ))}
    </View>
  );
}
