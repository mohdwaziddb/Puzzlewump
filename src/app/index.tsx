/**
 * Splash / title screen: floating islands, animated logo, mascot, hero + fox, "Tap to Start".
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BrainMascot, Logo } from '@/art/ui';
import { GameButton, GameText } from '@/components/ui';
import { Bob, SkyBackground } from '@/components/AnimatedBackground';
import { AnimatedCharacter } from '@/components/AnimatedCharacter';
import { useMenuMusic } from '@/components/hooks';
import { useProgress } from '@/store/progressStore';
import { colors } from '@/constants/theme';

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const onboarded = useProgress((s) => s.save.onboarded);
  const hero = useProgress((s) => s.save.selectedCharacter);
  useMenuMusic();

  const logoIn = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    logoIn.value = withSpring(1, { damping: 9, stiffness: 120 });
    pulse.value = withDelay(
      900,
      withRepeat(withSequence(withTiming(1.07, { duration: 650, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 650 })), -1, false),
    );
    return () => {
      cancelAnimation(logoIn);
      cancelAnimation(pulse);
    };
  }, [logoIn, pulse]);
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoIn.value, transform: [{ scale: 0.4 + logoIn.value * 0.6 }] }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const start = () => {
    router.replace(onboarded ? '/home' : '/character-select');
  };

  const compact = height < 700;
  const logoSize = Math.min(width * 0.86, 380, height * 0.42);
  const charSize = Math.min(width * 0.32, compact ? 110 : 150);

  return (
    <Pressable style={styles.root} onPress={start} accessibilityLabel="Tap to start">
      <SkyBackground top="#4FB5F5" bottom="#CDEEFF" clouds={5} />

      <View style={[styles.content, { paddingTop: insets.top + (compact ? 24 : 56), paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={logoStyle}>
          <Logo size={logoSize} />
        </Animated.View>

        <View style={styles.heroRow}>
          <AnimatedCharacter id={onboarded ? hero : 'max'} size={charSize} expression="happy" mode="wave" />
          <Bob amplitude={10} duration={1400} style={{ marginBottom: charSize * 0.7 }}>
            <BrainMascot size={charSize * 0.55} mood="wink" />
          </Bob>
          <AnimatedCharacter id="coco" size={charSize * 0.8} expression="happy" mode="idle" />
        </View>

        <View style={styles.bottom}>
          <Animated.View style={btnStyle}>
            <GameButton label="Tap to Start" variant="yellow" size="lg" onPress={start} sound="whoosh" style={{ minWidth: 240 }} />
          </Animated.View>
          <View style={{ backgroundColor: "rgba(20,60,120,0.55)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 }}>
            <GameText size={13} color="#fff" weight="bold" align="center">
              100% offline · no ads · made for curious kids
            </GameText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  abs: { position: 'absolute' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bottom: { alignItems: 'center', gap: 12 },
});
