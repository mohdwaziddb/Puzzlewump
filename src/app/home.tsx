/**
 * Home hub: top bar, waving hero, brain power, Play Adventure and menu buttons.
 * Shows the daily login reward once per day and celebrates freshly unlocked achievements.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeArtIcon, MenuArt } from '@/art/ui';
import { GameButton, GameText } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { AnimatedCharacter, type AnimatedCharacterHandle } from '@/components/AnimatedCharacter';
import { BrainPowerCard } from '@/components/BrainPowerCard';
import { MenuButton } from '@/components/MenuButton';
import { LoginRewardStrip, StreakFlame } from '@/components/MetaWidgets';
import { RewardModal } from '@/components/GameModal';
import { CoinBurst } from '@/components/CoinBurst';
import { useMenuMusic } from '@/components/hooks';
import { useProgress } from '@/store/progressStore';
import { canClaimLoginReward } from '@/services/GameProgressService';
import { LOGIN_REWARDS } from '@/engine/RewardEngine';
import { todayKey } from '@/engine/LevelEngine';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '@/data/achievements';
import { CHARACTER_BY_ID } from '@/data/characters';
import { WORLD_BY_ID } from '@/data/worlds';
import { AudioService } from '@/services/AudioService';
import { colors, radius } from '@/constants/theme';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const heroRef = useRef<AnimatedCharacterHandle>(null);
  const save = useProgress((s) => s.save);
  const claimLoginReward = useProgress((s) => s.claimLoginReward);
  const refreshUnlocks = useProgress((s) => s.refreshUnlocks);
  useMenuMusic();

  const [loginOpen, setLoginOpen] = useState(false);
  const [newAch, setNewAch] = useState<string[]>([]);
  const [burstKey, setBurstKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const st = useProgress.getState();
      const unlocked = st.refreshUnlocks();
      if (unlocked.length) setNewAch((q) => [...q, ...unlocked]);
      if (canClaimLoginReward(st.save, todayKey())) setLoginOpen(true);
    }, []),
  );

  const today = todayKey();
  const claimedToday = !canClaimLoginReward(save, today);
  const nextReward = LOGIN_REWARDS[save.daily.loginCycleDay % 7];
  const dailyDone = save.daily.challengeDates.includes(today);
  const achCount = Object.keys(save.achievements).length;
  const hero = CHARACTER_BY_ID[save.selectedCharacter];
  const heroSize = Math.min(width * 0.3, height * 0.17, 140);

  const collectLogin = () => {
    const r = claimLoginReward();
    setLoginOpen(false);
    if (r) {
      setBurstKey((k) => k + 1);
      heroRef.current?.jump();
      const more = refreshUnlocks();
      if (more.length) setNewAch((q) => [...q, ...more]);
    }
  };

  const ach = newAch.length && !loginOpen ? ACHIEVEMENT_BY_ID[newAch[0]] : undefined;
  const achId = ach?.id;
  useEffect(() => {
    if (achId) AudioService.play('achievement');
  }, [achId]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenScaffold back={false} scroll>
        <View style={styles.greetRow}>
          <Pressable
            onPress={() => {
              AudioService.play('pop');
              heroRef.current?.jump();
            }}
            accessibilityLabel={`${hero.name}, your hero`}
          >
            <AnimatedCharacter ref={heroRef} id={save.selectedCharacter} size={heroSize} expression="happy" mode="wave" />
          </Pressable>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.bubble}>
              <GameText size={26} color={colors.ink} weight="black">
                Hi, Champ!
              </GameText>
              <GameText size={15} color={colors.inkSoft} weight="medium">
                {hero.name} is ready for an adventure.
              </GameText>
              <View style={styles.bubbleTail} />
            </View>
            <View style={styles.streak}>
              <StreakFlame streak={save.daily.streak} size={30} />
              <GameText size={15} color="#fff" weight="black" outline>
                {save.daily.streak === 1 ? 'day streak' : 'days streak'}
              </GameText>
            </View>
          </View>
        </View>

        <BrainPowerCard />

        <GameButton variant="yellow" size="lg" onPress={() => router.push('/worlds')} sound="whoosh">
          <View style={styles.playInner}>
            <MenuArt name="map" size={60} />
            <View style={{ flexShrink: 1 }}>
              <GameText size={28} color="#6B3A00" weight="black">
                Play Adventure
              </GameText>
              <GameText size={14} color="#8A5300" weight="bold" numberOfLines={1}>
                Continue in {WORLD_BY_ID[save.lastWorld].name}
              </GameText>
            </View>
          </View>
        </GameButton>

        <MenuButton
          art="calendar"
          label="Daily Challenge"
          subtitle={dailyDone ? 'Done today — great job!' : 'A new puzzle every day'}
          badge={dailyDone ? undefined : '!'}
          onPress={() => router.push('/daily')}
        />
        <MenuButton
          art="trophy"
          label="My Achievements"
          subtitle={`${achCount} / ${ACHIEVEMENTS.length} badges`}
          onPress={() => router.push('/achievements')}
        />
        <MenuButton
          art="crown"
          label="Character & Rewards"
          subtitle={`${save.unlockedCharacters.length} / 4 heroes`}
          onPress={() => router.push('/characters')}
        />
        <MenuButton art="chart" label="My Progress" subtitle="Stars, levels & more" onPress={() => router.push('/progress')} />
        {claimedToday ? (
          <GameText size={13} color={colors.skyDeep} weight="bold" align="center">
            Come back tomorrow for {nextReward.coins} coins!
          </GameText>
        ) : null}
      </ScreenScaffold>

      <RewardModal
        visible={loginOpen}
        title="Daily Reward!"
        subtitle={`Day ${(save.daily.loginCycleDay % 7) + 1} of 7 — play every day for bigger prizes!`}
        art={<MenuArt name="gift" size={86} />}
        rewards={[
          { kind: 'coin', amount: nextReward.coins },
          ...(nextReward.hints ? [{ kind: 'hint' as const, amount: nextReward.hints }] : []),
        ]}
        buttonLabel="Collect!"
        onClose={collectLogin}
      >
        <LoginRewardStrip cycleDay={save.daily.loginCycleDay} claimedToday={false} />
      </RewardModal>

      <RewardModal
        visible={!!ach}
        title="New Badge!"
        art={ach ? <BadgeArtIcon art={ach.art} size={96} color={ach.color} /> : undefined}
        subtitle={ach ? `${ach.name} — ${ach.description}` : undefined}
        rewards={ach && ach.reward > 0 ? [{ kind: 'coin', amount: ach.reward }] : []}
        onClose={() => setNewAch((q) => q.slice(1))}
      />

      {burstKey > 0 && (
        <CoinBurst
          burstKey={burstKey}
          from={{ x: width / 2, y: height / 2 }}
          to={{ x: insets.left + 40, y: insets.top + 24 }}
          count={12}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  greetRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: colors.parchmentDeep,
  },
  bubbleTail: {
    position: 'absolute',
    left: -10,
    bottom: 14,
    width: 16,
    height: 16,
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.parchmentDeep,
    transform: [{ rotate: '45deg' }],
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217,96,26,0.85)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  playInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
});
