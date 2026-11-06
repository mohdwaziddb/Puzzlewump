/**
 * My Progress: overall totals, brain power, per-world progress and best scores.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WorldIcon } from '@/art/worlds';
import { BadgeArtIcon, ClockIcon, CoinIcon, LockIcon, StarIcon } from '@/art/ui';
import { GameButton, GameText, Panel, ProgressBar } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { BrainPowerCard } from '@/components/BrainPowerCard';
import { StatTile, StreakFlame } from '@/components/MetaWidgets';
import { formatDuration, useMenuMusic } from '@/components/hooks';
import { WORLDS, LEVELS_PER_WORLD } from '@/data/worlds';
import { ACHIEVEMENTS } from '@/data/achievements';
import { LEVELS_BY_WORLD, isWorldUnlocked, totalStars, worldCompletedCount, worldStars } from '@/engine/LevelEngine';
import { useProgress } from '@/store/progressStore';
import { colors, radius, worldThemes } from '@/constants/theme';

const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;

export default function ProgressScreen() {
  const router = useRouter();
  const save = useProgress((s) => s.save);
  useMenuMusic();

  const levelsDone = Object.values(save.levels).filter((l) => l.completed).length;
  const stars = totalStars(save);
  const achCount = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;

  return (
    <ScreenScaffold title="My Progress" scroll>
      <BrainPowerCard />

      <View style={styles.tiles}>
        <StatTile icon={<BadgeArtIcon art="medal" size={34} color={colors.blue} />} value={`${levelsDone}/${TOTAL_LEVELS}`} label="Levels done" />
        <StatTile icon={<StarIcon size={34} />} value={`${stars}/${TOTAL_LEVELS * 3}`} label="Stars" color={colors.yellowDeep} />
        <StatTile icon={<CoinIcon size={34} />} value={save.coins} label="Coins" color={colors.goldDeep} />
        <StatTile icon={<StreakFlame streak={save.daily.streak} size={30} />} value={save.daily.bestStreak} label="Best streak (days)" color={colors.orangeDeep} />
        <StatTile icon={<ClockIcon size={32} />} value={formatDuration(save.stats.playSeconds)} label="Time played" color={colors.purpleDeep} />
        <StatTile icon={<BadgeArtIcon art="gem" size={34} color="#22C3C9" />} value={save.stats.perfectLevels} label="Perfect levels" color="#138C91" />
        <StatTile icon={<BadgeArtIcon art="trophy" size={34} color={colors.gold} />} value={`${achCount}/${ACHIEVEMENTS.length}`} label="Badges" color={colors.greenDeep} />
        <StatTile icon={<BadgeArtIcon art="crown" size={34} color={colors.pink} />} value={`${save.unlockedCharacters.length}/4`} label="Heroes" color={colors.pinkDeep} />
        <StatTile icon={<BadgeArtIcon art="chest" size={34} color={colors.wood} />} value={save.stats.chestsOpened} label="Chests opened" color={colors.woodDeep} />
      </View>

      {WORLDS.map((w) => {
        const t = worldThemes[w.id];
        const unlocked = isWorldUnlocked(save, w.id);
        const done = worldCompletedCount(save, w.id);
        const ws = worldStars(save, w.id);
        const best = LEVELS_BY_WORLD[w.id].reduce(
          (acc, l) => {
            const p = save.levels[l.id];
            return p && p.bestScore > acc.score ? { score: p.bestScore, n: l.number } : acc;
          },
          { score: 0, n: 0 },
        );
        const bossDone = !!save.levels[`${w.id}-30`]?.completed;
        return (
          <Panel key={w.id} style={[styles.world, { borderColor: unlocked ? t.primary : colors.locked }]}>
            <View style={styles.worldTop}>
              <View style={!unlocked && { opacity: 0.5 }}>
                <WorldIcon worldId={w.id} size={60} />
              </View>
              <View style={{ flex: 1 }}>
                <GameText size={19} color={unlocked ? t.primaryDeep : colors.lockedDeep} weight="black" numberOfLines={1}>
                  {w.name}
                </GameText>
                {unlocked ? (
                  <View style={styles.inline}>
                    <StarIcon size={18} />
                    <GameText size={14} color={colors.ink} weight="black">
                      {ws}/{LEVELS_PER_WORLD * 3}
                    </GameText>
                    <GameText size={13} color={colors.inkSoft} weight="medium">
                      · Boss {bossDone ? 'beaten!' : 'waiting'}
                    </GameText>
                  </View>
                ) : (
                  <View style={styles.inline}>
                    <LockIcon size={18} />
                    <GameText size={13} color={colors.inkSoft} weight="bold">
                      Locked
                    </GameText>
                  </View>
                )}
              </View>
            </View>
            <ProgressBar progress={done / LEVELS_PER_WORLD} height={16} color={t.primary} label={`${done}/${LEVELS_PER_WORLD}`} />
            {best.score > 0 && (
              <GameText size={13} color={colors.inkSoft} weight="medium">
                Best score: {best.score} (level {best.n})
              </GameText>
            )}
            {unlocked && (
              <GameButton label="Open map" variant="blue" size="sm" onPress={() => router.push(`/levels/${w.id}`)} />
            )}
          </Panel>
        );
      })}

      <Panel style={styles.small}>
        <GameText size={14} color={colors.inkSoft} weight="medium" align="center">
          Levels played: {save.stats.levelsPlayed} · Won: {save.stats.levelsWon} · Hints used: {save.stats.hintsUsed}
        </GameText>
      </Panel>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  world: { gap: 8, borderWidth: 3, borderRadius: radius.lg },
  worldTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  small: { paddingVertical: 10 },
});
