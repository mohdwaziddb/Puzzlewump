/**
 * Small shared meta-game widgets: login reward strip, streak flame, character portrait,
 * glowing pedestal, big toggle switch and stat tiles.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { BadgeArtIcon, BulbIcon, CheckIcon, CoinIcon, LockIcon } from '@/art/ui';
import { CharacterArt } from '@/art/characters';
import { GameText } from '@/components/ui';
import { LOGIN_REWARDS } from '@/engine/RewardEngine';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';
import { colors, radius } from '@/constants/theme';
import type { CharacterId } from '@/types';

/* ------------------------------------------------------------ login strip */

/** Which tiles of the 7-day cycle are already claimed, and which one is "today". */
export function loginStripState(cycleDay: number, claimedToday: boolean) {
  const claimedCount = claimedToday ? (cycleDay === 0 ? 7 : cycleDay) : cycleDay;
  const todayIndex = claimedToday ? claimedCount - 1 : cycleDay;
  return { claimedCount, todayIndex };
}

export const LoginRewardStrip = React.memo(function LoginRewardStrip({
  cycleDay,
  claimedToday,
}: {
  cycleDay: number;
  claimedToday: boolean;
}) {
  const { claimedCount, todayIndex } = loginStripState(cycleDay, claimedToday);
  return (
    <View style={styles.strip}>
      {LOGIN_REWARDS.map((r, i) => {
        const claimed = i < claimedCount;
        const today = i === todayIndex;
        const big = i === 6;
        return (
          <View
            key={i}
            style={[
              styles.day,
              big && styles.dayBig,
              claimed && styles.dayClaimed,
              today && styles.dayToday,
            ]}
          >
            <GameText size={11} color={today ? '#6B3A00' : colors.inkSoft} weight="black">
              {today ? 'TODAY' : `Day ${i + 1}`}
            </GameText>
            <CoinIcon size={big ? 26 : 22} />
            <GameText size={13} color={colors.ink} weight="black">
              {r.coins}
            </GameText>
            {r.hints > 0 && (
              <View style={styles.hintTag}>
                <BulbIcon size={14} />
                <GameText size={10} color={colors.ink} weight="black">
                  +{r.hints}
                </GameText>
              </View>
            )}
            {claimed && (
              <View style={styles.check}>
                <CheckIcon size={14} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

/* ------------------------------------------------------------ streak flame */

export const StreakFlame = React.memo(function StreakFlame({ streak, size = 34 }: { streak: number; size?: number }) {
  return (
    <View style={styles.flame}>
      <BadgeArtIcon art="flame" size={size} color="#FF7A2E" />
      <GameText size={size * 0.55} color="#fff" weight="black" outline>
        {streak}
      </GameText>
    </View>
  );
});

/* ------------------------------------------------------- character bits */

/** Round portrait (head & shoulders crop of the full-body art). */
export const CharacterPortrait = React.memo(function CharacterPortrait({
  id,
  size,
  locked,
  selected,
  ring = colors.white,
  onPress,
}: {
  id: CharacterId;
  size: number;
  locked?: boolean;
  selected?: boolean;
  ring?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View
      style={[
        styles.portrait,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: selected ? colors.yellow : ring,
          borderWidth: selected ? 4 : 3,
          backgroundColor: locked ? '#8E97A8' : '#BFE6FF',
        },
      ]}
    >
      <View style={{ position: 'absolute', top: size * 0.06 }}>
        <CharacterArt id={id} size={size * 1.15} locked={locked} expression="happy" />
      </View>
      {locked && (
        <View style={styles.portraitLock}>
          <LockIcon size={size * 0.4} />
        </View>
      )}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={() => {
        AudioService.play('pop');
        vibrate('light');
        onPress();
      }}
      hitSlop={4}
      accessibilityRole="button"
    >
      {inner}
    </Pressable>
  );
});

/** Glowing round pedestal a character stands on. */
export const Pedestal = React.memo(function Pedestal({ width, color = '#FFE97A', glow = true }: { width: number; color?: string; glow?: boolean }) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (!glow) return;
    g.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(g);
  }, [g, glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 + g.value * 0.5 }));
  const h = width * 0.32;
  return (
    <View style={{ width, height: h }}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Svg width={width} height={h} viewBox="0 0 100 32">
          <Defs>
            <RadialGradient id="pg" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={color} stopOpacity={0.95} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={50} cy={14} rx={50} ry={14} fill="url(#pg)" />
        </Svg>
      </Animated.View>
      <Svg width={width} height={h} viewBox="0 0 100 32" style={StyleSheet.absoluteFill}>
        <Ellipse cx={50} cy={20} rx={40} ry={10} fill="#8A5A2E" />
        <Ellipse cx={50} cy={15} rx={40} ry={10} fill="#C98B4E" />
        <Ellipse cx={50} cy={14} rx={33} ry={7} fill="#E8B477" />
      </Svg>
    </View>
  );
});

/* ------------------------------------------------------------ big switch */

export const BigSwitch = React.memo(function BigSwitch({
  value,
  onChange,
  label,
  icon,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(value ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 38 }] }));
  return (
    <Pressable
      onPress={() => {
        AudioService.play('click');
        onChange(!value);
      }}
      style={styles.switchRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
    >
      {icon ? <View style={styles.switchIcon}>{icon}</View> : null}
      <GameText size={20} color={colors.ink} weight="black" style={{ flex: 1 }}>
        {label}
      </GameText>
      <View style={[styles.track, { backgroundColor: value ? colors.green : colors.locked, borderColor: value ? colors.greenDeep : colors.lockedDeep }]}>
        <GameText size={12} color="#fff" weight="black" style={[styles.trackText, value ? { left: 10 } : { right: 8 }]}>
          {value ? 'ON' : 'OFF'}
        </GameText>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
});

/* -------------------------------------------------------------- stat tile */

export const StatTile = React.memo(function StatTile({
  icon,
  value,
  label,
  color = colors.blueDeep,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <GameText size={22} color={color} weight="black" numberOfLines={1}>
        {value}
      </GameText>
      <GameText size={13} color={colors.inkSoft} weight="medium" align="center" numberOfLines={2}>
        {label}
      </GameText>
    </View>
  );
});

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  day: {
    width: 44,
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: colors.parchmentDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 1,
  },
  dayBig: { width: 54, backgroundColor: '#FFF1C7' },
  dayClaimed: { backgroundColor: '#DFF7D2', borderColor: colors.greenDeep },
  dayToday: { borderColor: colors.yellowDeep, backgroundColor: '#FFE36B', transform: [{ scale: 1.06 }] },
  hintTag: { flexDirection: 'row', alignItems: 'center' },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.greenDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  portrait: { overflow: 'hidden', alignItems: 'center' },
  portraitLock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,40,60,0.35)', alignItems: 'center', justifyContent: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 2.5,
    borderColor: colors.parchmentDeep,
    minHeight: 64,
  },
  switchIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { width: 82, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', padding: 3 },
  trackText: { position: 'absolute' },
  knob: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stat: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 96,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 2.5,
    borderColor: colors.parchmentDeep,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
  },
});
