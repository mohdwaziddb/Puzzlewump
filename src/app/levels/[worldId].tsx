/**
 * World map: scrollable winding sandy path with 30 level nodes (1 at the bottom),
 * boss at the top, hero standing at the current level, world chest when the boss is beaten.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BossArt } from '@/art/worlds';
import { ChestArt, StarIcon } from '@/art/ui';
import { GameButton, GameText, ProgressBar } from '@/components/ui';
import { ScreenScaffold, goBackOr } from '@/components/ScreenScaffold';
import { LevelNode, type LevelNodeState } from '@/components/LevelNode';
import { AnimatedCharacter } from '@/components/AnimatedCharacter';
import { Bob } from '@/components/AnimatedBackground';
import { ChestOpening } from '@/components/ChestOpening';
import { useMenuMusic } from '@/components/hooks';
import { WORLD_BY_ID, LEVELS_PER_WORLD } from '@/data/worlds';
import {
  LEVELS_BY_WORLD,
  currentLevelOf,
  isLevelUnlocked,
  isWorldUnlocked,
  worldCompletedCount,
  worldStars,
} from '@/engine/LevelEngine';
import { WORLD_CHEST_REWARD } from '@/engine/RewardEngine';
import { canClaimWorldChest } from '@/services/GameProgressService';
import { useProgress } from '@/store/progressStore';
import { worldThemes, radius } from '@/constants/theme';
import type { WorldId } from '@/types';

const STEP = 100; // vertical distance between nodes
const NODE = 62;
const TOP_PAD = 250; // room for the boss
const BOTTOM_PAD = 90;

export default function LevelMap() {
  const { worldId, chest } = useLocalSearchParams<{ worldId: string; chest?: string }>();
  const world = WORLD_BY_ID[worldId as WorldId];
  const save = useProgress((s) => s.save);
  useMenuMusic();

  if (!world) return <Redirect href="/worlds" />;
  if (!isWorldUnlocked(save, world.id)) return <Redirect href="/worlds" />;
  return <MapView worldId={world.id} autoChest={chest === '1'} />;
}

function MapView({ worldId, autoChest }: { worldId: WorldId; autoChest: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const save = useProgress((s) => s.save);
  const claimWorldChest = useProgress((s) => s.claimWorldChest);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const viewportH = useRef(0);
  const didScroll = useRef(false);
  const world = WORLD_BY_ID[worldId];
  const theme = worldThemes[worldId];
  const levels = LEVELS_BY_WORLD[worldId];

  const canChest = canClaimWorldChest(save, worldId);
  const chestClaimed = save.claimedWorldChests.includes(worldId);
  const [chestOpen, setChestOpen] = useState(autoChest && canChest);

  const W = Math.min(screenW, 560);
  const contentH = TOP_PAD + (levels.length - 1) * STEP + BOTTOM_PAD + NODE;

  const points = useMemo(
    () =>
      levels.map((_, i) => ({
        x: W / 2 + Math.sin(i * 0.85) * W * 0.27,
        y: contentH - BOTTOM_PAD - NODE / 2 - i * STEP,
      })),
    [levels, W, contentH],
  );

  const pathD = useMemo(() => {
    if (!points.length) return '';
    let d = `M ${points[0].x} ${points[0].y + 60}`;
    d += ` L ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const my = (a.y + b.y) / 2;
      d += ` C ${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y - 80}`;
    return d;
  }, [points]);

  const current = currentLevelOf(save, worldId);
  const currentIdx = current ? levels.findIndex((l) => l.id === current.id) : levels.length - 1;
  const done = worldCompletedCount(save, worldId);
  const stars = worldStars(save, worldId);

  const openLevel = useCallback((id: string) => router.push(`/game/${id}`), [router]);

  const scrollToCurrent = useCallback(() => {
    if (didScroll.current || !viewportH.current || !points.length) return;
    didScroll.current = true;
    const p = points[Math.max(0, currentIdx)];
    const y = Math.max(0, Math.min(contentH - viewportH.current, p.y - viewportH.current * 0.6));
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  }, [points, currentIdx, contentH]);

  if (!levels.length) {
    return (
      <ScreenScaffold title={world.name} worldId={worldId} onBack={() => goBackOr(router, '/worlds')}>
        <GameText size={20} color="#fff" weight="black" align="center" outline style={{ marginTop: 40 }}>
          Levels are coming soon!
        </GameText>
      </ScreenScaffold>
    );
  }

  const boss = points[points.length - 1];
  const heroP = points[Math.max(0, currentIdx)];
  const heroLeftSide = heroP.x > W / 2;

  return (
    <ScreenScaffold title={world.name} worldId={worldId} onBack={() => goBackOr(router, '/worlds')}>
      <View style={styles.progressRow}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={done / LEVELS_PER_WORLD} height={18} color={theme.accent} label={`${done} / ${LEVELS_PER_WORLD} levels`} />
        </View>
        <View style={styles.starPill}>
          <StarIcon size={22} />
          <GameText size={15} color="#fff" weight="black">
            {stars}/{LEVELS_PER_WORLD * 3}
          </GameText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => {
          viewportH.current = e.nativeEvent.layout.height;
          scrollToCurrent();
        }}
        onContentSizeChange={scrollToCurrent}
      >
        <View style={{ width: W, height: contentH }}>
          <Svg width={W} height={contentH} style={StyleSheet.absoluteFill}>
            <Path d={pathD} stroke="rgba(90,55,20,0.35)" strokeWidth={34} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="#F2D59A" strokeWidth={28} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="#FFE9BE" strokeWidth={14} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="rgba(184,107,50,0.45)" strokeWidth={4} fill="none" strokeDasharray="2 16" strokeLinecap="round" />
          </Svg>

          {/* boss on top */}
          <View style={[styles.boss, { left: boss.x - 85, top: boss.y - NODE / 2 - 205 }]} pointerEvents="none">
            <Bob amplitude={8} duration={1600}>
              <BossArt worldId={worldId} size={150} />
            </Bob>
            <View style={[styles.bossName, { backgroundColor: theme.primaryDeep }]}>
              <GameText size={13} color="#fff" weight="black" numberOfLines={1}>
                {world.bossName}
              </GameText>
            </View>
          </View>

          {levels.map((l, i) => {
            const p = points[i];
            const prog = save.levels[l.id];
            const state: LevelNodeState = prog?.completed
              ? 'done'
              : current?.id === l.id
                ? 'current'
                : isLevelUnlocked(save, l)
                  ? 'open'
                  : 'locked';
            const isBoss = l.number === LEVELS_PER_WORLD;
            const s = isBoss ? NODE * 1.25 : NODE;
            return (
              <View key={l.id} style={{ position: 'absolute', left: p.x - (s + 24) / 2, top: p.y - s / 2 }}>
                <LevelNode
                  levelId={l.id}
                  number={l.number}
                  state={state}
                  stars={prog?.stars ?? 0}
                  boss={isBoss}
                  size={NODE}
                  onOpen={openLevel}
                />
              </View>
            );
          })}

          {current && (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: heroP.y - 80, left: heroLeftSide ? heroP.x - 115 : heroP.x + 45 }}
            >
              <AnimatedCharacter id={save.selectedCharacter} size={64} expression="happy" mode="idle" />
            </View>
          )}

          {(canChest || chestClaimed) && (
            <View style={{ position: 'absolute', top: boss.y - 40, left: boss.x > W / 2 ? boss.x - 150 : boss.x + 60 }} pointerEvents="none">
              <Bob amplitude={canChest ? 6 : 0} duration={700}>
                <ChestArt size={72} open={chestClaimed} />
              </Bob>
            </View>
          )}
        </View>
      </ScrollView>

      {canChest && (
        <View style={[styles.chestBar, { bottom: insets.bottom + 14 }]}>
          <GameButton variant="orange" size="lg" sound="pop" onPress={() => setChestOpen(true)} icon={<ChestArt size={44} />}>
            <GameText size={22} color="#fff" weight="black" outline>
              Open World Chest!
            </GameText>
          </GameButton>
        </View>
      )}

      <ChestOpening
        visible={chestOpen}
        title={`${world.name} Treasure!`}
        rewards={[
          { kind: 'coin', amount: WORLD_CHEST_REWARD.coins },
          { kind: 'hint', amount: WORLD_CHEST_REWARD.hints },
        ]}
        onClose={() => setChestOpen(false)}
        onCollect={() => {
          claimWorldChest(worldId);
          setChestOpen(false);
        }}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30,40,80,0.55)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  boss: { position: 'absolute', width: 170, alignItems: 'center' },
  bossName: { marginTop: -6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 3, borderWidth: 2, borderColor: '#fff', maxWidth: 170 },
  chestBar: { position: 'absolute', left: 16, right: 16, maxWidth: 520, alignSelf: 'center' },
});
