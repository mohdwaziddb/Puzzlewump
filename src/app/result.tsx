/**
 * Level result: cheering hero, stars pop in one by one, coins count up and fly to the
 * counter, achievements / new friends / world-complete celebrations, then Home / Retry / Next.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type HostInstance } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { BadgeArtIcon, ChestArt, ClockIcon, CoinIcon, HomeIcon, RetryIcon, StarIcon } from '@/art/ui';
import { GameButton, GameText, IconButton, Panel } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { AnimatedCharacter } from '@/components/AnimatedCharacter';
import { Ribbon, RewardModal } from '@/components/GameModal';
import { ChestOpening } from '@/components/ChestOpening';
import { CoinBurst } from '@/components/CoinBurst';
import { Confetti } from '@/components/Confetti';
import { formatDuration, useSafeTimeouts } from '@/components/hooks';
import { getLevel, isLevelUnlocked, nextLevelId } from '@/engine/LevelEngine';
import { WORLD_CHEST_REWARD } from '@/engine/RewardEngine';
import { canClaimWorldChest } from '@/services/GameProgressService';
import { ACHIEVEMENT_BY_ID } from '@/data/achievements';
import { CHARACTER_BY_ID } from '@/data/characters';
import { WORLD_BY_ID } from '@/data/worlds';
import { useProgress } from '@/store/progressStore';
import { AudioService } from '@/services/AudioService';
import { vibrate } from '@/store/settingsStore';
import { colors, radius } from '@/constants/theme';
import type { LevelResult } from '@/types';

const STAR_DELAY = 450;
const STAR_GAP = 380;

export default function Result() {
  const result = useProgress((s) => s.lastResult);
  if (!result) return <Redirect href="/home" />;
  return <ResultView key={`${result.levelId}-${result.score}-${result.timeSec}`} result={result} />;
}

function BigStar({ v, raised }: { v: SharedValue<number>; raised: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: v.value > 0.01 ? 1 : 0,
    transform: [{ scale: v.value }, { rotate: `${(1 - v.value) * -90}deg` }],
  }));
  return (
    <View style={[styles.starSlot, raised && { marginTop: -26 }]}>
      <View style={StyleSheet.absoluteFill}>
        <StarIcon size={raised ? 82 : 66} filled={false} />
      </View>
      <Animated.View style={style}>
        <StarIcon size={raised ? 82 : 66} />
      </Animated.View>
    </View>
  );
}

function ResultView({ result }: { result: LevelResult }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const save = useProgress((s) => s.save);
  const claimWorldChest = useProgress((s) => s.claimWorldChest);
  const later = useSafeTimeouts();
  const coinBoxRef = useRef<HostInstance>(null);

  const level = getLevel(result.levelId);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const starVals = [s0, s1, s2];

  const [coinsShown, setCoinsShown] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [friendQueue, setFriendQueue] = useState(result.unlockedCharacters);
  const [chestOpen, setChestOpen] = useState(false);

  useEffect(() => {
    AudioService.play('complete');
    vibrate('success');
    for (let i = 0; i < result.stars; i++) {
      starVals[i].value = withDelay(STAR_DELAY + i * STAR_GAP, withSpring(1, { damping: 7, stiffness: 160 }));
      later(() => AudioService.play('star'), STAR_DELAY + i * STAR_GAP);
    }
    const coinStart = STAR_DELAY + result.stars * STAR_GAP + 150;
    later(() => {
      coinBoxRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0) setBurst({ x: x + w / 2, y: y + h / 2 });
      });
      const steps = 16;
      for (let k = 1; k <= steps; k++) {
        later(() => setCoinsShown(Math.round((result.coins * k) / steps)), k * 45);
      }
    }, coinStart);
    later(() => {
      setSequenceDone(true);
      if (result.newAchievements.length) AudioService.play('achievement');
    }, coinStart + 900);
    // run once per result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!level) return <Redirect href="/home" />;

  const next = nextLevelId(level);
  const nextLevel = next ? getLevel(next) : undefined;
  const nextUnlocked = !!nextLevel && isLevelUnlocked(save, nextLevel);
  const chestReady = !!result.worldCompleted && canClaimWorldChest(save, result.worldCompleted);
  const friend = sequenceDone && friendQueue.length ? CHARACTER_BY_ID[friendQueue[0]] : undefined;
  const heroSize = Math.min(width * 0.3, height * 0.16, 130);

  const goHome = () => router.dismissTo('/home');
  const retry = () => router.replace(`/game/${level.id}`);
  const goNext = () => {
    if (next && nextUnlocked) router.replace(`/game/${next}`);
  };

  const title = result.isDaily ? 'Daily Challenge Done!' : level.tier === 'boss' ? 'Boss Defeated!' : 'Level Completed!';

  return (
    <View style={{ flex: 1 }}>
      <ScreenScaffold
        worldId={level.worldId}
        back={false}
        showSettings={false}
        showHints
        scroll
        footer={
          <View style={styles.buttons}>
            <IconButton onPress={goHome} variant="blue" size={58}>
              <HomeIcon size={30} />
            </IconButton>
            {result.isDaily ? (
              <GameButton label="Back Home" variant="green" size="lg" onPress={goHome} style={{ flex: 1 }} />
            ) : nextUnlocked ? (
              <GameButton label="Next Level" variant="green" size="lg" onPress={goNext} sound="whoosh" style={{ flex: 1 }} />
            ) : (
              <GameButton label="Level Map" variant="green" size="lg" onPress={() => router.replace(`/levels/${level.worldId}`)} style={{ flex: 1 }} />
            )}
            <IconButton onPress={retry} variant="orange" size={58}>
              <RetryIcon size={30} />
            </IconButton>
          </View>
        }
      >
        <Ribbon title={title} size={width < 380 ? 21 : 25} />
        <View style={styles.heroRow}>
          <AnimatedCharacter id={save.selectedCharacter} size={heroSize} expression="cheer" mode="cheer" />
          <View style={styles.stars}>
            {[0, 1, 2].map((i) => (
              <BigStar key={i} v={starVals[i]} raised={i === 1} />
            ))}
          </View>
        </View>

        <Panel style={styles.panel}>
          <GameText size={16} color={colors.inkSoft} weight="bold" align="center">
            {result.isDaily ? 'Daily Challenge' : `${WORLD_BY_ID[level.worldId].name} · Level ${level.number}`}
          </GameText>
          <View style={styles.scoreRow}>
            <GameText size={34} color={colors.blueDeep} weight="black">
              {result.score}
            </GameText>
            <GameText size={16} color={colors.inkSoft} weight="bold">
              points
            </GameText>
            {result.newBest && (
              <Animated.View entering={ZoomIn.delay(1600)} style={styles.newBest}>
                <GameText size={14} color="#fff" weight="black">
                  New best!
                </GameText>
              </Animated.View>
            )}
          </View>
          <View style={styles.boxes}>
            <View ref={coinBoxRef} style={styles.box} collapsable={false}>
              <CoinIcon size={38} />
              <GameText size={24} color={colors.ink} weight="black">
                +{coinsShown}
              </GameText>
            </View>
            <View style={styles.box}>
              <StarIcon size={38} />
              <GameText size={24} color={colors.ink} weight="black">
                {result.stars}/3
              </GameText>
            </View>
            <View style={styles.box}>
              <ClockIcon size={36} />
              <GameText size={20} color={colors.ink} weight="black">
                {formatDuration(result.timeSec)}
              </GameText>
            </View>
          </View>
          <GameText size={14} color={colors.inkSoft} weight="medium" align="center">
            {result.mistakes === 0 ? 'No mistakes — amazing!' : `${result.mistakes} ${result.mistakes === 1 ? 'mistake' : 'mistakes'}`}
            {result.hintsUsed > 0 ? ` · ${result.hintsUsed} ${result.hintsUsed === 1 ? 'hint' : 'hints'} used` : ''}
          </GameText>
        </Panel>

        {result.worldCompleted && (
          <Animated.View entering={FadeInDown.delay(1800)}>
            <Panel style={[styles.panel, { backgroundColor: '#FFF1C7' }]}>
              <GameText size={24} color={colors.orangeDeep} weight="black" align="center">
                World Complete!
              </GameText>
              <GameText size={15} color={colors.inkSoft} weight="medium" align="center">
                You beat {WORLD_BY_ID[result.worldCompleted].bossName}!
              </GameText>
              {chestReady ? (
                <GameButton variant="orange" onPress={() => setChestOpen(true)} sound="pop" icon={<ChestArt size={38} />}>
                  <GameText size={19} color="#fff" weight="black" outline>
                    Open Treasure Chest
                  </GameText>
                </GameButton>
              ) : (
                <GameText size={15} color={colors.greenDeep} weight="black" align="center">
                  Treasure collected!
                </GameText>
              )}
            </Panel>
          </Animated.View>
        )}

        {sequenceDone && result.newAchievements.length > 0 && (
          <Animated.View entering={FadeInDown}>
            <Panel style={styles.panel}>
              <GameText size={20} color={colors.purpleDeep} weight="black" align="center">
                New Badges!
              </GameText>
              {result.newAchievements.map((id) => {
                const a = ACHIEVEMENT_BY_ID[id];
                if (!a) return null;
                return (
                  <View key={id} style={styles.achRow}>
                    <BadgeArtIcon art={a.art} size={46} color={a.color} />
                    <View style={{ flex: 1 }}>
                      <GameText size={17} color={colors.ink} weight="black">
                        {a.name}
                      </GameText>
                      <GameText size={13} color={colors.inkSoft} weight="medium">
                        {a.description}
                      </GameText>
                    </View>
                    {a.reward > 0 && (
                      <View style={styles.achReward}>
                        <CoinIcon size={20} />
                        <GameText size={14} color={colors.ink} weight="black">
                          +{a.reward}
                        </GameText>
                      </View>
                    )}
                  </View>
                );
              })}
            </Panel>
          </Animated.View>
        )}
      </ScreenScaffold>

      {result.stars === 3 && <Confetti burstKey="win" />}
      {sequenceDone && result.newAchievements.length > 0 && <Confetti burstKey="ach" count={30} />}
      {burst && result.coins > 0 && (
        <CoinBurst from={burst} to={{ x: insets.left + 40, y: insets.top + 24 }} count={Math.min(14, 4 + Math.floor(result.coins / 10))} />
      )}

      <RewardModal
        visible={!!friend && !chestOpen}
        title="New Friend!"
        art={friend ? <AnimatedCharacter id={friend.id} size={120} expression="cheer" mode="cheer" /> : undefined}
        subtitle={friend ? `${friend.name}, ${friend.title}, joined your team!` : undefined}
        buttonLabel="Yay!"
        onClose={() => setFriendQueue((q) => q.slice(1))}
      />

      {result.worldCompleted && (
        <ChestOpening
          visible={chestOpen}
          title={`${WORLD_BY_ID[result.worldCompleted].name} Treasure!`}
          rewards={[
            { kind: 'coin', amount: WORLD_CHEST_REWARD.coins },
            { kind: 'hint', amount: WORLD_CHEST_REWARD.hints },
          ]}
          onClose={() => setChestOpen(false)}
          onCollect={() => {
            if (result.worldCompleted) claimWorldChest(result.worldCompleted);
            setChestOpen(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  stars: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20 },
  starSlot: { alignItems: 'center', justifyContent: 'center' },
  panel: { gap: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  newBest: { backgroundColor: colors.pinkDeep, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: '-6deg' }] },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.parchmentDeep,
    paddingVertical: 8,
  },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achReward: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
