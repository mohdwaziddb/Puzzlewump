/**
 * Round 3D numbered level button for the world map.
 * States: locked (grey + lock, shakes on tap), open, current (pulsing glow), done (stars).
 * Boss variant is bigger with a skull-free cute crown badge.
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
import { LinearGradient } from 'expo-linear-gradient';
import { GameText, StarRating } from '@/components/ui';
import { LockIcon } from '@/art/ui';
import { useShake } from '@/components/hooks';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';

export type LevelNodeState = 'locked' | 'open' | 'current' | 'done';

const PALETTE = {
  locked: { top: '#D5DAE3', bottom: '#9AA3B2', edge: '#5F6878' },
  open: { top: '#8CD2FF', bottom: '#3D9BFF', edge: '#1C5FC2' },
  current: { top: '#FFE36B', bottom: '#FFB81C', edge: '#C77800' },
  done: { top: '#8AF05E', bottom: '#45C21E', edge: '#24800E' },
  boss: { top: '#FF8F93', bottom: '#E0353D', edge: '#8E1720' },
};

export const LevelNode = React.memo(function LevelNode({
  number,
  state,
  stars,
  boss = false,
  size = 64,
  levelId,
  onOpen,
}: {
  number: number;
  state: LevelNodeState;
  stars: number;
  boss?: boolean;
  size?: number;
  levelId: string;
  onOpen: (levelId: string) => void;
}) {
  const s = boss ? size * 1.25 : size;
  const edge = Math.round(s * 0.09);
  const c = state === 'locked' ? PALETTE.locked : boss && state !== 'done' ? PALETTE.boss : PALETTE[state];
  const press = useSharedValue(0);
  const pulse = useSharedValue(0);
  const { style: shakeStyle, shake } = useShake(6);

  useEffect(() => {
    if (state !== 'current') return;
    pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [state, pulse]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * (edge - 1) }, { scale: 1 + pulse.value * 0.06 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.45,
    transform: [{ scale: 1.15 + pulse.value * 0.2 }],
  }));

  const onPress = () => {
    if (state === 'locked') {
      shake();
      return;
    }
    AudioService.play('click');
    vibrate('light');
    onOpen(levelId);
  };

  return (
    <Animated.View style={[{ width: s + 24, alignItems: 'center' }, shakeStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (press.value = withTiming(1, { duration: 60 }))}
        onPressOut={() => (press.value = withSpring(0))}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Level ${number}${state === 'locked' ? ', locked' : ''}`}
        style={{ width: s, height: s + edge }}
      >
        {state === 'current' && (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { width: s, height: s, borderRadius: s / 2 }, glowStyle]}
          />
        )}
        <View style={{ position: 'absolute', top: edge, width: s, height: s, borderRadius: s / 2, backgroundColor: c.edge }} />
        <Animated.View style={faceStyle}>
          <LinearGradient
            colors={[c.top, c.bottom]}
            style={[styles.face, { width: s, height: s, borderRadius: s / 2, borderColor: c.edge, borderWidth: Math.max(2, s * 0.045) }]}
          >
            <View style={[styles.gloss, { width: s * 0.6, height: s * 0.24, borderRadius: s * 0.2, top: s * 0.08 }]} />
            {state === 'locked' ? (
              <LockIcon size={s * 0.46} />
            ) : (
              <GameText size={s * (number > 9 ? 0.4 : 0.46)} color="#fff" weight="black" outline>
                {number}
              </GameText>
            )}
          </LinearGradient>
        </Animated.View>
        {boss && (
          <View style={[styles.bossTag, { top: -s * 0.18 }]}>
            <GameText size={11} color="#fff" weight="black">
              BOSS
            </GameText>
          </View>
        )}
      </Pressable>
      <View style={{ height: 20, marginTop: 2, opacity: state === 'locked' ? 0 : 1 }}>
        <StarRating stars={stars} size={boss ? 22 : 18} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gloss: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.4)' },
  glow: { position: 'absolute', top: 0, left: 0, backgroundColor: '#FFF27A' },
  bossTag: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#8E1720',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
