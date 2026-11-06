/**
 * Coins burst out of a point and fly to a target (usually the coin counter).
 * Coordinates are relative to the full-screen overlay this renders (place it at screen root).
 * One shared value drives all coins; unmounts itself after the flight.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { CoinIcon } from '@/art/ui';
import { AudioService } from '@/services/AudioService';

type Pt = { x: number; y: number };
const COIN = 28;

const FlyingCoin = React.memo(function FlyingCoin({ t, from, to, sx, sy, delay }: {
  t: SharedValue<number>;
  from: Pt;
  to: Pt;
  sx: number;
  sy: number;
  delay: number;
}) {
  const style = useAnimatedStyle(() => {
    const v = t.value;
    // phase 1 (0..0.3): pop out to scatter point. phase 2: fly to target, staggered by delay.
    const p1 = Math.min(1, v / 0.3);
    const ease1 = 1 - (1 - p1) * (1 - p1);
    const p2raw = (v - 0.3 - delay) / (0.7 - delay);
    const p2 = Math.min(1, Math.max(0, p2raw));
    const ease2 = p2 * p2;
    const scatterX = from.x + sx * ease1;
    const scatterY = from.y + sy * ease1;
    const x = scatterX + (to.x - scatterX) * ease2;
    const y = scatterY + (to.y - scatterY) * ease2 - Math.sin(p2 * Math.PI) * 40;
    return {
      opacity: p2 >= 1 ? 0 : 1,
      transform: [{ translateX: x - COIN / 2 }, { translateY: y - COIN / 2 }, { scale: 0.6 + ease1 * 0.5 - ease2 * 0.4 }],
    };
  });
  return (
    <Animated.View style={[styles.coin, style]}>
      <CoinIcon size={COIN} />
    </Animated.View>
  );
});

export function CoinBurst({ from, to, count = 10, duration = 1300, burstKey = 0, onDone }: {
  from: Pt;
  to: Pt;
  count?: number;
  duration?: number;
  burstKey?: number | string;
  onDone?: () => void;
}) {
  const t = useSharedValue(0);
  const [active, setActive] = useState(true);
  const coins = useMemo(
    () =>
      Array.from({ length: Math.min(16, count) }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const r = 40 + Math.random() * 40;
        return { sx: Math.cos(a) * r, sy: Math.sin(a) * r - 20, delay: Math.random() * 0.25 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, burstKey],
  );

  useEffect(() => {
    setActive(true);
    t.value = 0;
    t.value = withTiming(1, { duration, easing: Easing.linear });
    const timers = [0.45, 0.6, 0.75, 0.9].map((f) => setTimeout(() => AudioService.play('coin'), duration * f));
    const done = setTimeout(() => {
      setActive(false);
      onDone?.();
    }, duration + 30);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
      cancelAnimation(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, duration]);

  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {coins.map((c, i) => (
        <FlyingCoin key={i} t={t} from={from} to={to} sx={c.sx} sy={c.sy} delay={c.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coin: { position: 'absolute', left: 0, top: 0 },
});
