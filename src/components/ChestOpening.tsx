/**
 * Treasure chest opening sequence in a modal:
 * tap the wobbling chest -> it shakes -> lid opens -> coins burst + confetti -> Collect.
 * `onCollect` is where the caller actually grants the reward (e.g. claimWorldChest).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChestArt } from '@/art/ui';
import { GameButton, GameText } from '@/components/ui';
import { GameModal, RewardBox, Ribbon, type RewardItem } from '@/components/GameModal';
import { CoinBurst } from '@/components/CoinBurst';
import { Confetti } from '@/components/Confetti';
import { useSafeTimeouts } from '@/components/hooks';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';
import { colors } from '@/constants/theme';

const CHEST = 170;

type Phase = 'closed' | 'opening' | 'open';

export function ChestOpening({
  visible,
  title = 'Treasure Chest!',
  rewards,
  onCollect,
  onClose,
}: {
  visible: boolean;
  title?: string;
  rewards: RewardItem[];
  /** Grant the reward. Called once when the player taps Collect. */
  onCollect: () => void;
  /** Close without opening (Android back before opening). */
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('closed');
  const later = useSafeTimeouts();
  const wobble = useSharedValue(0);
  const pop = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    setPhase('closed');
    glow.value = 0;
    wobble.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 120 }),
        withTiming(4, { duration: 120 }),
        withTiming(0, { duration: 120 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(wobble);
      cancelAnimation(glow);
    };
  }, [visible, wobble, glow]);

  const open = () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    cancelAnimation(wobble);
    vibrate('light');
    wobble.value = withRepeat(withSequence(withTiming(-9, { duration: 60 }), withTiming(9, { duration: 60 })), 6, true, () => {
      wobble.value = 0;
    });
    later(() => {
      AudioService.play('chest');
      vibrate('success');
      setPhase('open');
      pop.value = withSequence(withTiming(1.2, { duration: 140 }), withSpring(1, { damping: 6 }));
      glow.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, 800);
  };

  const chestStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }, { scale: pop.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.4 + glow.value * 0.5, transform: [{ scale: 1 + glow.value * 0.15 }] }));

  return (
    <GameModal visible={visible} onClose={phase === 'open' ? onCollect : onClose}>
      <Ribbon title={title} color={colors.orange} deep={colors.orangeDeep} />
      <Pressable onPress={open} disabled={phase !== 'closed'} accessibilityRole="button" accessibilityLabel="Open the chest">
        <View style={styles.stage}>
          {phase === 'open' && <Animated.View style={[styles.glow, glowStyle]} />}
          <Animated.View style={chestStyle}>
            <ChestArt size={CHEST} open={phase === 'open'} />
          </Animated.View>
          {phase === 'open' && (
            <CoinBurst from={{ x: 120, y: 110 }} to={{ x: 120, y: -60 }} count={12} duration={1100} />
          )}
        </View>
      </Pressable>
      {phase !== 'open' ? (
        <GameText size={20} color={colors.inkSoft} weight="black" align="center">
          {phase === 'closed' ? 'Tap the chest to open it!' : 'Opening...'}
        </GameText>
      ) : (
        <>
          <View style={styles.rewardRow}>
            {rewards.map((r) => (
              <RewardBox key={r.kind} {...r} big />
            ))}
          </View>
          <GameButton label="Collect!" variant="green" size="lg" sound="coin" onPress={onCollect} style={{ alignSelf: 'stretch' }} />
        </>
      )}
      {phase === 'open' && <Confetti count={36} />}
    </GameModal>
  );
}

const styles = StyleSheet.create({
  stage: { width: 240, height: 200, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFE97A' },
  rewardRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
});
