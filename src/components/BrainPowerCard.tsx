/**
 * Blue "Your Brain Power – Level N" card with progress to the next level.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrainMascot } from '@/art/ui';
import { GameText, ProgressBar } from '@/components/ui';
import { brainLevel, brainPower } from '@/engine/RewardEngine';
import { levelStarList } from '@/engine/LevelEngine';
import { useProgress } from '@/store/progressStore';
import { radius } from '@/constants/theme';

export function useBrainPower() {
  const levels = useProgress((s) => s.save.levels);
  return useMemo(() => {
    // levelStarList only reads save.levels
    const power = brainPower(levelStarList({ levels } as Parameters<typeof levelStarList>[0]));
    return { power, ...brainLevel(power) };
  }, [levels]);
}

export const BrainPowerCard = React.memo(function BrainPowerCard() {
  const { level, progress, power, nextAt } = useBrainPower();
  return (
    <LinearGradient colors={['#5FB6FF', '#2F7FE6']} style={styles.card}>
      <BrainMascot size={58} mood="happy" />
      <View style={{ flex: 1, gap: 4 }}>
        <GameText size={15} color="#E3F2FF" weight="bold">
          Your Brain Power
        </GameText>
        <GameText size={24} color="#fff" weight="black" outline>
          Level {level}
        </GameText>
        <ProgressBar progress={progress} height={16} color="#FFD23F" track="rgba(0,30,90,0.35)" />
        <GameText size={12} color="#E3F2FF" weight="medium">
          {power} / {nextAt} brain points
        </GameText>
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: '#1E5FC0',
  },
});
