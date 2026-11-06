/**
 * World picker: 5 big colored cards with emblem, progress and stars.
 * Locked worlds shake gently and explain how to unlock them.
 */
import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { WorldIcon } from '@/art/worlds';
import { CheckIcon, LockIcon, StarIcon } from '@/art/ui';
import { GameText, ProgressBar } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { useMenuMusic, useShake } from '@/components/hooks';
import { WORLDS, WORLD_BY_ID, LEVELS_PER_WORLD, type WorldInfo } from '@/data/worlds';
import { isWorldUnlocked, worldCompletedCount, worldStars } from '@/engine/LevelEngine';
import { useProgress } from '@/store/progressStore';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';
import { worldThemes, radius } from '@/constants/theme';
import type { WorldId } from '@/types';

const WorldCard = React.memo(function WorldCard({
  world,
  unlocked,
  done,
  stars,
  onOpen,
}: {
  world: WorldInfo;
  unlocked: boolean;
  done: number;
  stars: number;
  onOpen: (id: WorldId) => void;
}) {
  const t = worldThemes[world.id];
  const { style, shake } = useShake(10);
  const complete = done >= LEVELS_PER_WORLD;
  const prev = world.index > 0 ? WORLDS[world.index - 1] : null;

  const press = () => {
    if (!unlocked) {
      shake();
      return;
    }
    AudioService.play('whoosh');
    vibrate('light');
    onOpen(world.id);
  };

  return (
    <Animated.View style={style}>
      <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`${world.name}${unlocked ? '' : ', locked'}`}>
        <View style={[styles.cardEdge, { backgroundColor: unlocked ? t.primaryDeep : '#5F6878' }]} />
        <LinearGradient
          colors={unlocked ? [t.primary, t.primaryDeep] : ['#B9C0CC', '#8C95A5']}
          style={[styles.card, { borderColor: unlocked ? t.primaryDeep : '#5F6878' }]}
        >
          <View style={styles.gloss} />
          <View style={styles.iconWrap}>
            <View style={!unlocked && { opacity: 0.5 }}>
              <WorldIcon worldId={world.id} size={84} />
            </View>
            {!unlocked && (
              <View style={styles.lockOverlay}>
                <LockIcon size={44} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <GameText size={14} color="rgba(255,255,255,0.9)" weight="bold">
              World {world.index + 1}
            </GameText>
            <GameText size={22} color="#fff" weight="black" outline numberOfLines={1}>
              {world.name}
            </GameText>
            {unlocked ? (
              <>
                <View style={styles.pillRow}>
                  <View style={styles.pill}>
                    <StarIcon size={18} />
                    <GameText size={14} color="#fff" weight="black">
                      {stars}/{LEVELS_PER_WORLD * 3}
                    </GameText>
                  </View>
                  <View style={styles.pill}>
                    <GameText size={14} color="#fff" weight="black">
                      {LEVELS_PER_WORLD} Levels
                    </GameText>
                  </View>
                  {complete && (
                    <View style={[styles.pill, { backgroundColor: '#2E9C17' }]}>
                      <CheckIcon size={14} />
                    </View>
                  )}
                </View>
                <ProgressBar progress={done / LEVELS_PER_WORLD} height={14} color={t.accent} label={`${done}/${LEVELS_PER_WORLD}`} />
              </>
            ) : (
              <GameText size={14} color="#fff" weight="bold">
                Beat {prev ? WORLD_BY_ID[prev.id].bossName : 'the boss'} to unlock
              </GameText>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

export default function Worlds() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const save = useProgress((s) => s.save);
  const setLastWorld = useProgress((s) => s.setLastWorld);
  useMenuMusic();

  const open = useCallback(
    (id: WorldId) => {
      setLastWorld(id);
      router.push(`/levels/${id}`);
    },
    [router, setLastWorld],
  );

  return (
    <ScreenScaffold title="Choose a World">
      <FlatList
        data={WORLDS}
        keyExtractor={(w) => w.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <WorldCard
            world={item}
            unlocked={isWorldUnlocked(save, item.id)}
            done={worldCompletedCount(save, item.id)}
            stars={worldStars(save, item.id)}
            onOpen={open}
          />
        )}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cardEdge: { position: 'absolute', left: 0, right: 0, top: 6, bottom: -6, borderRadius: radius.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  gloss: { position: 'absolute', top: 4, left: 16, right: 16, height: '30%', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)' },
  iconWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  lockOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
