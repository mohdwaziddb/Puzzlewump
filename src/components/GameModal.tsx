/**
 * Kid-friendly modal shell (dimmed backdrop + bouncy card) and a generic RewardModal.
 * Android back button calls onClose — never traps the player.
 */
import React, { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { GameButton, GameText, Panel, type ButtonVariant } from '@/components/ui';
import { BulbIcon, CoinIcon, StarIcon } from '@/art/ui';
import { Confetti } from '@/components/Confetti';
import { colors, radius } from '@/constants/theme';

export function GameModal({
  visible,
  onClose,
  children,
  maxWidth = 380,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const { height } = useWindowDimensions();
  const scale = useSharedValue(0.7);
  useEffect(() => {
    if (visible) {
      scale.value = 0.7;
      scale.value = withSpring(1, { damping: 11, stiffness: 180 });
    } else scale.value = withTiming(0.7, { duration: 120 });
  }, [visible, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[{ width: '100%', maxWidth, maxHeight: height * 0.9 }, style]}>
          <Panel style={styles.card} color={colors.cream}>
            <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false} bounces={false}>
              {children}
            </ScrollView>
          </Panel>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Red ribbon banner title ("Level Completed!", "Daily Reward"). */
export function Ribbon({ title, color = colors.red, deep = colors.redDeep, size = 24 }: { title: string; color?: string; deep?: string; size?: number }) {
  return (
    <View style={styles.ribbonWrap}>
      <Svg width={34} height={38} viewBox="0 0 34 38" style={[styles.ribbonTail, { left: 0 }]}>
        <Path d="M34 0 L0 0 L10 19 L0 38 L34 38 Z" fill={deep} stroke="#fff" strokeWidth={2} />
      </Svg>
      <Svg width={34} height={38} viewBox="0 0 34 38" style={[styles.ribbonTail, { right: 0 }]}>
        <Path d="M0 0 L34 0 L24 19 L34 38 L0 38 Z" fill={deep} stroke="#fff" strokeWidth={2} />
      </Svg>
      <LinearGradient colors={[color, deep]} style={styles.ribbon}>
        <GameText size={size} color="#fff" weight="black" outline align="center" numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </GameText>
      </LinearGradient>
    </View>
  );
}

export type RewardKind = 'coin' | 'hint' | 'star';
export interface RewardItem {
  kind: RewardKind;
  amount: number;
}

/** Cream box with icon + "+amount". */
export const RewardBox = React.memo(function RewardBox({ kind, amount, big = false }: RewardItem & { big?: boolean }) {
  const ic = big ? 44 : 34;
  return (
    <View style={[styles.rewardBox, big && { paddingVertical: 12, minWidth: 104 }]}>
      {kind === 'coin' ? <CoinIcon size={ic} /> : kind === 'star' ? <StarIcon size={ic} /> : <BulbIcon size={ic} />}
      <GameText size={big ? 24 : 20} color={colors.ink} weight="black">
        +{amount}
      </GameText>
      <GameText size={12} color={colors.inkSoft} weight="medium">
        {kind === 'coin' ? 'coins' : kind === 'star' ? 'stars' : amount === 1 ? 'hint' : 'hints'}
      </GameText>
    </View>
  );
});

export function RewardModal({
  visible,
  title,
  subtitle,
  art,
  rewards = [],
  buttonLabel = 'Awesome!',
  buttonVariant = 'green',
  onClose,
  children,
  confetti = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  art?: React.ReactNode;
  rewards?: RewardItem[];
  buttonLabel?: string;
  buttonVariant?: ButtonVariant;
  onClose: () => void;
  children?: React.ReactNode;
  confetti?: boolean;
}) {
  return (
    <GameModal visible={visible} onClose={onClose}>
      <Ribbon title={title} />
      {art ? <View style={styles.art}>{art}</View> : null}
      {subtitle ? (
        <GameText size={17} color={colors.inkSoft} align="center" weight="medium">
          {subtitle}
        </GameText>
      ) : null}
      {children}
      {rewards.length > 0 && (
        <View style={styles.rewardRow}>
          {rewards.map((r) => (
            <RewardBox key={r.kind} {...r} />
          ))}
        </View>
      )}
      <GameButton label={buttonLabel} variant={buttonVariant} onPress={onClose} sound="coin" style={{ alignSelf: 'stretch' }} />
      {visible && confetti ? <Confetti count={30} /> : null}
    </GameModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { padding: 0, borderWidth: 4, borderColor: colors.parchmentDeep, overflow: 'hidden' },
  cardContent: { padding: 18, gap: 12, alignItems: 'center' },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  rewardRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  rewardBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.parchmentDeep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 86,
  },
  ribbonWrap: { alignSelf: 'center', paddingVertical: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  ribbonTail: { position: 'absolute', top: 12 },
  ribbon: {
    paddingHorizontal: 22,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    marginHorizontal: 16,
    maxWidth: '100%',
  },
});
