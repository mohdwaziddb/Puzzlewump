/**
 * Core reusable UI kit. Every screen and game uses these — keep the look consistent.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, textOutline } from '@/constants/theme';
import { CoinIcon, StarIcon, HeartIcon, BulbIcon } from '@/art/ui';
import { AudioService, type SfxName } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';

/* ------------------------------------------------------------------ text */

export function GameText({
  children,
  size = 18,
  color = colors.ink,
  weight = 'bold',
  outline = false,
  align,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: keyof typeof fonts;
  outline?: boolean;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      allowFontScaling={false}
      style={[
        { fontFamily: fonts[weight], fontSize: size, color, textAlign: align },
        outline && textOutline,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------------------------------------------------------------- button */

export type ButtonVariant = 'yellow' | 'green' | 'orange' | 'purple' | 'blue' | 'red' | 'cream' | 'pink' | 'grey';

export const BUTTON_COLORS: Record<ButtonVariant, { top: string; bottom: string; edge: string; text: string }> = {
  yellow: { top: '#FFE36B', bottom: '#FFB81C', edge: '#C77800', text: '#6B3A00' },
  green: { top: '#8AF05E', bottom: '#45C21E', edge: '#24800E', text: '#FFFFFF' },
  orange: { top: '#FFB36B', bottom: '#FF7A2E', edge: '#C24A0B', text: '#FFFFFF' },
  purple: { top: '#C3A2FF', bottom: '#8D5CF0', edge: '#5B33B5', text: '#FFFFFF' },
  blue: { top: '#8CD2FF', bottom: '#3D9BFF', edge: '#1C5FC2', text: '#FFFFFF' },
  red: { top: '#FF8F93', bottom: '#F2484F', edge: '#A9202A', text: '#FFFFFF' },
  cream: { top: '#FFFBF1', bottom: '#F6DFB5', edge: '#C79A5B', text: '#5A3A16' },
  pink: { top: '#FFB3D6', bottom: '#FF6FAE', edge: '#C23F7C', text: '#FFFFFF' },
  grey: { top: '#D5DAE3', bottom: '#A7B0BF', edge: '#6F7888', text: '#FFFFFF' },
};

/**
 * Chunky 3D game button: gradient face + darker edge, squashes when pressed,
 * plays the click sound. Pass `children` for custom content or `label` for text.
 */
export function GameButton({
  label,
  children,
  onPress,
  variant = 'yellow',
  size = 'md',
  disabled,
  style,
  sound = 'click',
  textSize,
  icon,
}: {
  label?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  sound?: SfxName | null;
  textSize?: number;
  icon?: React.ReactNode;
}) {
  const c = BUTTON_COLORS[disabled ? 'grey' : variant];
  const press = useSharedValue(0);
  const edge = size === 'lg' ? 7 : size === 'md' ? 6 : 4;
  const h = size === 'lg' ? 68 : size === 'md' ? 54 : 42;
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (edge - 1) }, { scale: 1 - press.value * 0.03 }],
  }));
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => (press.value = withTiming(1, { duration: 70 }))}
      onPressOut={() => (press.value = withSpring(0, { damping: 9, stiffness: 300 }))}
      onPress={() => {
        if (sound) AudioService.play(sound);
        vibrate('light');
        onPress?.();
      }}
      style={[{ minHeight: h + edge }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.btnEdge, { backgroundColor: c.edge, top: edge, borderRadius: radius.lg }]} />
      <Animated.View style={[{ borderRadius: radius.lg, overflow: 'hidden', minHeight: h }, aStyle]}>
        <LinearGradient colors={[c.top, c.bottom]} style={[styles.btnFace, { minHeight: h, borderColor: c.edge }]}>
          <View style={styles.btnGloss} />
          {icon}
          {children ??
            (label ? (
              <GameText size={textSize ?? (size === 'lg' ? 26 : size === 'md' ? 21 : 17)} color={c.text} weight="black" outline={c.text === '#FFFFFF'}>
                {label}
              </GameText>
            ) : null)}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/** Round icon button (back, pause, hint, settings). */
export function IconButton({
  children,
  onPress,
  variant = 'yellow',
  size = 50,
  badge,
  disabled,
  sound = 'click',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: number;
  badge?: number | string;
  disabled?: boolean;
  sound?: SfxName | null;
}) {
  const c = BUTTON_COLORS[disabled ? 'grey' : variant];
  const press = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 3 }, { scale: 1 - press.value * 0.06 }] }));
  return (
    <Pressable
      disabled={disabled}
      hitSlop={8}
      onPressIn={() => (press.value = withTiming(1, { duration: 60 }))}
      onPressOut={() => (press.value = withSpring(0))}
      onPress={() => {
        if (sound) AudioService.play(sound);
        vibrate('light');
        onPress?.();
      }}
      style={{ width: size, height: size + 4 }}
    >
      <View style={{ position: 'absolute', top: 4, width: size, height: size, borderRadius: size / 2, backgroundColor: c.edge }} />
      <Animated.View style={aStyle}>
        <LinearGradient
          colors={[c.top, c.bottom]}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: c.edge }}
        >
          {children}
        </LinearGradient>
      </Animated.View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <GameText size={12} color="#fff" weight="black">
            {badge}
          </GameText>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------------------------------------------------- signs/panels */

/** Wooden hanging sign used for screen titles ("Choose a World", "Level 5"). */
export function WoodSign({ title, size = 'md', style }: { title: string; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle> }) {
  const fs = size === 'lg' ? 28 : size === 'md' ? 22 : 17;
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <LinearGradient colors={[colors.woodLight, colors.wood]} style={[styles.wood, { paddingVertical: size === 'sm' ? 4 : 8 }]}>
        <View style={styles.woodGrain} />
        <GameText size={fs} color="#FFF6E5" weight="black" outline numberOfLines={1}>
          {title}
        </GameText>
      </LinearGradient>
    </View>
  );
}

/** Parchment card for instructions/questions. */
export function Parchment({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.parchment, style]}>{children}</View>;
}

/** Glassy rounded panel (used on menus, stats, modals). */
export function Panel({ children, style, color = 'rgba(255,255,255,0.92)' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; color?: string }) {
  return <View style={[styles.panel, { backgroundColor: color }, style]}>{children}</View>;
}

/* --------------------------------------------------------------- counters */

/** Pill with icon + number. Animates a bump when value changes. */
export function CounterPill({ kind, value, size = 'md' }: { kind: 'coin' | 'star' | 'hint'; value: number; size?: 'sm' | 'md' }) {
  const bump = useSharedValue(1);
  useEffect(() => {
    bump.value = withSpring(1.18, { damping: 6 }, () => {
      bump.value = withSpring(1);
    });
  }, [value, bump]);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const ic = size === 'md' ? 30 : 22;
  return (
    <View style={[styles.pill, size === 'sm' && { paddingRight: 10, height: 30 }]}>
      <Animated.View style={[{ marginLeft: -8 }, aStyle]}>
        {kind === 'coin' ? <CoinIcon size={ic} /> : kind === 'star' ? <StarIcon size={ic} /> : <BulbIcon size={ic} />}
      </Animated.View>
      <GameText size={size === 'md' ? 18 : 14} color="#fff" weight="black" style={{ marginLeft: 6 }}>
        {value}
      </GameText>
    </View>
  );
}

/** 0-3 stars in a row; the middle one raised like in the reference art. */
export function StarRating({ stars, size = 18, arc = true }: { stars: number; size?: number; arc?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginHorizontal: -size * 0.04, transform: [{ translateY: arc && i === 1 ? -size * 0.25 : 0 }] }}>
          <StarIcon size={size} filled={i < stars} />
        </View>
      ))}
    </View>
  );
}

export function Hearts({ lives, max, size = 26 }: { lives: number; max: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <HeartIcon key={i} size={size} filled={i < lives} />
      ))}
    </View>
  );
}

/** Animated progress bar (green fill on dark track) with optional label. */
export function ProgressBar({
  progress,
  height = 16,
  color = colors.green,
  track = 'rgba(0,0,0,0.25)',
  label,
}: {
  progress: number;
  height?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 500 });
  }, [progress, p]);
  const aStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: height / 2, backgroundColor: color }, aStyle]}>
        <View style={{ position: 'absolute', left: 4, right: 4, top: 2, height: height * 0.3, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.45)' }} />
      </Animated.View>
      {label ? (
        <GameText size={height * 0.7} color="#fff" weight="black" align="center" outline>
          {label}
        </GameText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btnEdge: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  btnFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 10,
    borderWidth: 2.5,
    borderRadius: radius.lg,
  },
  btnGloss: {
    position: 'absolute',
    top: 3,
    left: 10,
    right: 10,
    height: '38%',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.blueDeep,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wood: {
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.woodDeep,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    overflow: 'hidden',
  },
  woodGrain: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '55%',
    height: 2,
    backgroundColor: 'rgba(90,40,10,0.25)',
  },
  parchment: {
    backgroundColor: colors.parchment,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.parchmentDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  panel: {
    borderRadius: radius.xl,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingRight: 14,
    paddingLeft: 4,
    marginLeft: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 40, 80, 0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
