/**
 * Achievements grid: badge art (locked/unlocked), progress bar and coin reward.
 */
import React from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeArtIcon, CheckIcon, CoinIcon } from '@/art/ui';
import { GameText, Panel, ProgressBar } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { useMenuMusic } from '@/components/hooks';
import { ACHIEVEMENTS, type Achievement } from '@/data/achievements';
import { useProgress } from '@/store/progressStore';
import { colors, radius } from '@/constants/theme';
import type { SaveData } from '@/types';

const BadgeCard = React.memo(function BadgeCard({ a, save, width }: { a: Achievement; save: SaveData; width: number }) {
  const unlocked = !!save.achievements[a.id];
  const p = a.progress(save);
  const frac = unlocked ? 1 : Math.min(1, p.current / p.target);
  return (
    <View style={[styles.card, { width }, unlocked ? { borderColor: a.color } : styles.cardLocked]}>
      <View style={!unlocked && { opacity: 0.55 }}>
        <BadgeArtIcon art={a.art} size={70} color={unlocked ? a.color : colors.locked} locked={!unlocked} />
      </View>
      {unlocked && (
        <View style={[styles.check, { backgroundColor: colors.greenDeep }]}>
          <CheckIcon size={16} />
        </View>
      )}
      <GameText size={16} color={colors.ink} weight="black" align="center" numberOfLines={2}>
        {a.name}
      </GameText>
      <GameText size={12} color={colors.inkSoft} weight="medium" align="center" numberOfLines={3} style={{ minHeight: 30 }}>
        {a.description}
      </GameText>
      <View style={{ alignSelf: 'stretch' }}>
        <ProgressBar
          progress={frac}
          height={16}
          color={unlocked ? colors.green : colors.yellow}
          label={unlocked ? 'Done!' : `${Math.min(p.current, p.target)} / ${p.target}`}
        />
      </View>
      {a.reward > 0 && (
        <View style={styles.reward}>
          <CoinIcon size={18} />
          <GameText size={13} color={colors.ink} weight="black">
            {a.reward}
          </GameText>
        </View>
      )}
    </View>
  );
});

export default function Achievements() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const save = useProgress((s) => s.save);
  useMenuMusic();

  const unlockedCount = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;
  const inner = Math.min(width, 560) - 32;
  const cardW = (inner - 12) / 2;

  return (
    <ScreenScaffold title="My Achievements">
      <FlatList
        data={ACHIEVEMENTS}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Panel style={styles.header}>
            <GameText size={20} color={colors.ink} weight="black" align="center">
              {unlockedCount} / {ACHIEVEMENTS.length} badges earned
            </GameText>
            <ProgressBar progress={unlockedCount / ACHIEVEMENTS.length} height={18} color={colors.purple} />
          </Panel>
        }
        renderItem={({ item }) => <BadgeCard a={item} save={save} width={cardW} />}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { gap: 8, marginBottom: 4 },
  card: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    borderWidth: 3,
    padding: 10,
  },
  cardLocked: { borderColor: colors.locked, backgroundColor: 'rgba(240,242,246,0.95)' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
