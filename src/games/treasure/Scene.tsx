/**
 * Reusable Treasure Island scene: beach backdrop + placed items + rings/badges + tap hit-testing.
 * Used by find-difference, hidden-object, visual-counting (and anything else that needs a scene).
 */
import React, { useEffect, useId, useMemo } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ItemIcon, type ItemName } from '@/art/items';
import { GameText } from '@/components/ui';
import { fitScene, hitTest, type SceneData, type SceneObject, type Tint } from './sceneModel';

/* ----------------------------------------------------------------- styling */

/**
 * Recolour for "colour" differences: a strongly tinted copy of the item is blended on top.
 * Works identically on Android, iOS and web (Image tintColor), no filters needed.
 * Lower brightness (subtle = 0.62) => lighter blend, so subtle differences stay subtle.
 */
export function tintOverlay(t?: Tint): { color: string; opacity: number } | undefined {
  if (!t) return undefined;
  return { color: `hsl(${Math.round(((t.hue % 360) + 360) % 360)}, 90%, 55%)`, opacity: t.brightness < 0.5 ? 0.42 : 0.3 };
}

/** One item drawn with rotation / mirror / tint / silhouette, centred in a size x size box. */
export function ItemSprite({
  item,
  size,
  rotation = 0,
  flip = false,
  tint,
  silhouette,
}: {
  item: ItemName;
  size: number;
  rotation?: number;
  flip?: boolean;
  tint?: Tint;
  silhouette?: boolean;
}) {
  return (
    <View
      style={[
        { width: size, height: size, transform: [{ rotate: `${rotation}deg` }, { scaleX: flip ? -1 : 1 }] },
        silhouette ? { opacity: 0.85 } : null,
      ]}
    >
      <ItemIcon name={item} size={size} silhouette={silhouette ? "#2B2140" : undefined} overlay={silhouette ? undefined : tintOverlay(tint)} />
    </View>
  );
}

/* ---------------------------------------------------------------- backdrop */

function Palm({ x, y, h, mirror }: { x: number; y: number; h: number; mirror?: boolean }) {
  const m = mirror ? -1 : 1;
  const top = { x: x + m * h * 0.25, y: y - h };
  const leaves = [-150, -115, -70, -30, 10].map((a, i) => {
    const rad = ((mirror ? 180 - a : a) * Math.PI) / 180;
    const len = h * (0.55 + (i % 2) * 0.1);
    const ex = top.x + Math.cos(rad) * len;
    const ey = top.y + Math.sin(rad) * len * 0.7 + h * 0.18;
    const cx = top.x + Math.cos(rad) * len * 0.5;
    const cy = top.y + Math.sin(rad) * len * 0.5 - h * 0.12;
    return `M${top.x},${top.y} Q${cx},${cy - h * 0.06} ${ex},${ey} Q${cx},${cy + h * 0.08} ${top.x},${top.y} Z`;
  });
  return (
    <G>
      <Path
        d={`M${x - h * 0.05},${y} Q${x + m * h * 0.02},${y - h * 0.55} ${top.x - h * 0.03},${top.y} L${top.x + h * 0.03},${top.y} Q${x + m * h * 0.1},${y - h * 0.55} ${x + h * 0.05},${y} Z`}
        fill="#A0652E"
        stroke="#6E3F17"
        strokeWidth={0.6}
      />
      {[0.25, 0.45, 0.65].map((f) => (
        <Path
          key={f}
          d={`M${x + m * h * 0.25 * f * f - h * 0.045},${y - h * f} l${h * 0.09},0`}
          stroke="#6E3F17"
          strokeWidth={0.6}
        />
      ))}
      {leaves.map((d, i) => (
        <Path key={i} d={d} fill={i % 2 ? '#3FA34D' : '#2E8B3C'} stroke="#1D6128" strokeWidth={0.5} />
      ))}
      <Circle cx={top.x - 1.2} cy={top.y + 1.5} r={1.6} fill="#7A4A1F" />
      <Circle cx={top.x + 1.4} cy={top.y + 1.8} r={1.6} fill="#7A4A1F" />
    </G>
  );
}

const SKIES = [
  ['#6CC8FF', '#D3F1FF'],
  ['#5BB8F5', '#C9ECFF'],
  ['#FFB48A', '#FFE7B8'],
  ['#7FD3FF', '#E8F8FF'],
];

/** Beach / island backdrop drawn in a 100 x 100*aspect viewBox, rendered at any size. */
export const BeachBackdrop = React.memo(function BeachBackdrop({
  width,
  height,
  variant = 0,
}: {
  width: number;
  height: number;
  variant?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = (100 * height) / Math.max(1, width);
  const seaTop = H * 0.2;
  const sandTop = H * 0.34;
  const sky = SKIES[variant % SKIES.length];
  const mirror = variant % 2 === 1;
  return (
    <Svg width={width} height={height} viewBox={`0 0 100 ${H}`}>
      <Defs>
        <LinearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky[0]} />
          <Stop offset="1" stopColor={sky[1]} />
        </LinearGradient>
        <LinearGradient id={`sea${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1E9BD7" />
          <Stop offset="1" stopColor="#5FD3E8" />
        </LinearGradient>
        <LinearGradient id={`sand${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FCE3A6" />
          <Stop offset="1" stopColor="#EFC57A" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={H} fill={`url(#sky${uid})`} />
      <Circle cx={mirror ? 18 : 82} cy={H * 0.08} r={6} fill="#FFE35C" opacity={0.95} />
      <Ellipse cx={mirror ? 70 : 30} cy={H * 0.07} rx={9} ry={2.6} fill="#FFFFFF" opacity={0.85} />
      <Ellipse cx={mirror ? 75 : 25} cy={H * 0.055} rx={5} ry={2.4} fill="#FFFFFF" opacity={0.85} />
      <Rect x={0} y={seaTop} width={100} height={sandTop - seaTop + 4} fill={`url(#sea${uid})`} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Path
          key={i}
          d={`M${i * 18 + 3},${seaTop + 3 + (i % 2) * 3} q3,-1.5 6,0`}
          stroke="#FFFFFF"
          strokeWidth={0.6}
          fill="none"
          opacity={0.7}
        />
      ))}
      <Path
        d={`M0,${sandTop + 2} Q15,${sandTop - 2} 30,${sandTop + 1} T60,${sandTop} T100,${sandTop + 1} L100,${H} L0,${H} Z`}
        fill={`url(#sand${uid})`}
      />
      <Path
        d={`M0,${sandTop + 2} Q15,${sandTop - 2} 30,${sandTop + 1} T60,${sandTop} T100,${sandTop + 1}`}
        stroke="#FFFFFF"
        strokeWidth={0.9}
        fill="none"
        opacity={0.8}
      />
      {[
        [12, 0.55],
        [40, 0.7],
        [66, 0.5],
        [88, 0.82],
        [25, 0.9],
        [55, 0.95],
      ].map(([x, f], i) => (
        <Ellipse key={i} cx={x} cy={H * f} rx={2.2} ry={0.8} fill="#E2B064" opacity={0.6} />
      ))}
      <Palm x={mirror ? 92 : 8} y={sandTop + H * 0.12} h={H * 0.3} mirror={mirror} />
      <Palm x={mirror ? 4 : 96} y={sandTop + H * 0.05} h={H * 0.22} mirror={!mirror} />
    </Svg>
  );
});

/* ------------------------------------------------------------------- rings */

/** Circle marker (found difference / hint pulse) positioned at a centre in px. */
export function Ring({
  cx,
  cy,
  r,
  color = '#FF3B3B',
  pulse,
  pop = true,
}: {
  cx: number;
  cy: number;
  r: number;
  color?: string;
  pulse?: boolean;
  pop?: boolean;
}) {
  const s = useSharedValue(pop || pulse ? 0.3 : 1);
  useEffect(() => {
    if (pulse) {
      s.value = withRepeat(withSequence(withTiming(1.15, { duration: 450 }), withTiming(0.9, { duration: 450 })), -1, true);
    } else {
      s.value = withSpring(1, { damping: 8 });
    }
    return () => cancelAnimation(s);
  }, [pulse, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: 4,
          borderColor: color,
          backgroundColor: pulse ? 'rgba(255,230,80,0.25)' : 'transparent',
        },
        st,
      ]}
    />
  );
}

/* ------------------------------------------------------------------- scene */

export interface SceneRing {
  key: string;
  x: number;
  y: number;
  size: number;
  color?: string;
  pulse?: boolean;
}

export interface SceneBadge {
  key: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface SceneTap {
  /** tap position in px inside the scene */
  px: number;
  py: number;
  /** normalized */
  nx: number;
  ny: number;
  sceneW: number;
  sceneH: number;
  /** object under the finger (nearest within hit radius) */
  hit: SceneObject | null;
}

/**
 * Renders a scene that fits in maxWidth x maxHeight (keeping the scene aspect).
 * `hiddenIds` objects are not drawn (e.g. already collected). Taps are hit-tested.
 */
export function Scene({
  data,
  maxWidth,
  maxHeight,
  onTap,
  rings,
  badges,
  hiddenIds,
  dimIds,
  disabled,
  style,
}: {
  data: SceneData;
  maxWidth: number;
  maxHeight: number;
  onTap?: (t: SceneTap) => void;
  rings?: SceneRing[];
  badges?: SceneBadge[];
  hiddenIds?: ReadonlySet<string>;
  dimIds?: ReadonlySet<string>;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { w, h } = fitScene(data.aspect, maxWidth, maxHeight);
  const visible = useMemo(() => data.objects.filter((o) => !hiddenIds?.has(o.id)), [data.objects, hiddenIds]);
  const handle = (e: GestureResponderEvent) => {
    if (!onTap || disabled) return;
    const { locationX: px, locationY: py } = e.nativeEvent;
    onTap({ px, py, nx: px / w, ny: py / h, sceneW: w, sceneH: h, hit: hitTest(visible, px, py, w, data.aspect) });
  };
  return (
    <Pressable onPress={handle} style={[styles.frame, { width: w, height: h }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BeachBackdrop width={w} height={h} variant={data.variant} />
        {visible.map((o) => {
          const s = o.size * w;
          return (
            <View
              key={o.id}
              style={{ position: 'absolute', left: o.x * w - s / 2, top: o.y * h - s / 2, opacity: dimIds?.has(o.id) ? 0.35 : 1 }}
            >
              <ItemSprite item={o.item} size={s} rotation={o.rotation} flip={o.flip} tint={o.tint} />
            </View>
          );
        })}
        {rings?.map((r) => (
          <Ring key={r.key} cx={r.x * w} cy={r.y * h} r={Math.max(r.size * w * 0.62, 24)} color={r.color} pulse={r.pulse} />
        ))}
        {badges?.map((b) => (
          <View key={b.key} style={[styles.badge, { left: b.x * w - 2, top: b.y * h - 26, backgroundColor: b.color ?? '#2E9C17' }]}>
            <GameText size={13} color="#fff" weight="black">
              {b.text}
            </GameText>
          </View>
        ))}
        <View style={styles.border} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FCE3A6',
  },
  border: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 14, borderWidth: 3, borderColor: '#7A3F17' },
  badge: {
    position: 'absolute',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
