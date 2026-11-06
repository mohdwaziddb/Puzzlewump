/**
 * Light animated backgrounds: sky gradient, drifting clouds and floating islands.
 * Only a handful of animated views (cheap on low-end Android).
 */
import { Image } from "react-native";
import { SCENES_IMG } from "@/art/images";
import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Path, Rect, Circle, Polygon } from 'react-native-svg';
import { colors } from '@/constants/theme';

export const CloudShape = React.memo(function CloudShape({ width, opacity = 0.9 }: { width: number; opacity?: number }) {
  return (
    <Svg width={width} height={width * 0.5} viewBox="0 0 120 60" opacity={opacity}>
      <Ellipse cx={60} cy={44} rx={56} ry={14} fill="#fff" />
      <Circle cx={38} cy={34} r={20} fill="#fff" />
      <Circle cx={66} cy={26} r={24} fill="#fff" />
      <Circle cx={92} cy={36} r={16} fill="#fff" />
      <Ellipse cx={60} cy={52} rx={50} ry={6} fill="#DDF1FF" />
    </Svg>
  );
});

function DriftingCloud({ top, width, duration, delay, screenW, opacity }: {
  top: number;
  width: number;
  duration: number;
  delay: number;
  screenW: number;
  opacity: number;
}) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [x, duration, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + x.value * (screenW + width * 2) }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', top, left: 0 }, style]} pointerEvents="none">
      <CloudShape width={width} opacity={opacity} />
    </Animated.View>
  );
}

/** A few clouds slowly drifting across the screen. */
export const FloatingClouds = React.memo(function FloatingClouds({ count = 4 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const clouds = [
    { top: height * 0.06, w: 120, d: 38000, delay: 0, o: 0.95 },
    { top: height * 0.2, w: 90, d: 30000, delay: 6000, o: 0.8 },
    { top: height * 0.38, w: 140, d: 46000, delay: 2000, o: 0.7 },
    { top: height * 0.55, w: 80, d: 34000, delay: 12000, o: 0.6 },
    { top: height * 0.72, w: 110, d: 42000, delay: 9000, o: 0.6 },
  ].slice(0, count);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {clouds.map((c, i) => (
        <DriftingCloud key={i} top={c.top} width={c.w} duration={c.d} delay={c.delay} screenW={width} opacity={c.o} />
      ))}
    </View>
  );
});

/** Vertical bobbing wrapper for decorations. */
export function Bob({ children, amplitude = 8, duration = 1800, delay = 0, style }: {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  style?: object;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(y);
  }, [y, amplitude, duration, delay]);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

/** Small floating island with grass top and rocky bottom; optional castle. */
export const FloatingIsland = React.memo(function FloatingIsland({ width, castle = false }: { width: number; castle?: boolean }) {
  return (
    <Svg width={width} height={width * 0.9} viewBox="0 0 100 90">
      {castle && (
        <>
          <Rect x={30} y={14} width={40} height={34} fill="#E9E2F5" stroke="#8C7BB0" strokeWidth={2} />
          <Rect x={24} y={6} width={14} height={42} fill="#F4EEFF" stroke="#8C7BB0" strokeWidth={2} />
          <Rect x={62} y={6} width={14} height={42} fill="#F4EEFF" stroke="#8C7BB0" strokeWidth={2} />
          <Polygon points="22,8 31,-6 40,8" fill="#9B6CF0" />
          <Polygon points="60,8 69,-6 78,8" fill="#9B6CF0" />
          <Polygon points="40,16 50,2 60,16" fill="#FF7EB6" />
          <Path d="M44 48 L44 36 Q50 28 56 36 L56 48 Z" fill="#7A3F17" />
        </>
      )}
      <Path d="M6 50 Q50 40 94 50 L74 78 Q50 92 26 78 Z" fill="#9A6A44" />
      <Path d="M26 62 L50 88 L72 64 Z" fill="#7A4E2E" />
      <Ellipse cx={50} cy={50} rx={46} ry={9} fill={colors.grass} />
      <Ellipse cx={50} cy={48} rx={40} ry={6} fill="#8BE05C" />
    </Svg>
  );
});

/** Plain cartoon sky (gradient + drifting clouds) used behind menus. */
export const SkyBackground = React.memo(function SkyBackground({
  top = colors.sky,
  bottom = colors.skyLight,
  clouds = 4,
}: {
  top?: string;
  bottom?: string;
  clouds?: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
      <Image source={SCENES_IMG.memory} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />
      {clouds > 0 && <FloatingClouds count={Math.min(clouds, 3)} />}
    </View>
  );
});
