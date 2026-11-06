/**
 * Daily Challenge: today's puzzle card, streak, last-7-days check marks and the 7-day login reward calendar.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WorldIcon } from '@/art/worlds';
import { BulbIcon, CheckIcon, CoinIcon, MenuArt } from '@/art/ui';
import { GameButton, GameText, Panel, Parchment } from '@/components/ui';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LoginRewardStrip, StreakFlame } from '@/components/MetaWidgets';
import { RewardModal } from '@/components/GameModal';
import { useMenuMusic } from '@/components/hooks';
import { getDailyChallenge, todayKey } from '@/engine/LevelEngine';
import { DAILY_CHALLENGE_REWARD, LOGIN_REWARDS } from '@/engine/RewardEngine';
import { canClaimLoginReward } from '@/services/GameProgressService';
import { WORLD_BY_ID } from '@/data/worlds';
import { useProgress } from '@/store/progressStore';
import { colors, radius, worldThemes } from '@/constants/theme';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Daily() {
  const router = useRouter();
  const save = useProgress((s) => s.save);
  const claimLoginReward = useProgress((s) => s.claimLoginReward);
  const [claimed, setClaimed] = React.useState<{ coins: number; hints: number } | null>(null);
  useMenuMusic();

  const today = todayKey();
  const challenge = useMemo(() => getDailyChallenge(today), [today]);
  const done = save.daily.challengeDates.includes(today);
  const canClaim = canClaimLoginReward(save, today);
  const nextReward = LOGIN_REWARDS[save.daily.loginCycleDay % 7];

  const last7 = useMemo(() => {
    const dates = new Set(save.daily.challengeDates);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = todayKey(d);
      return { key, label: i === 6 ? 'Today' : DAY_NAMES[d.getDay()], done: dates.has(key) };
    });
  }, [save.daily.challengeDates]);

  const theme = challenge ? worldThemes[challenge.worldId] : worldThemes.memory;

  return (
    <ScreenScaffold title="Daily Challenge" scroll>
      <Panel style={[styles.card, { borderColor: theme.primaryDeep }]}>
        {challenge ? (
          <>
            <View style={styles.cardTop}>
              <WorldIcon worldId={challenge.worldId} size={80} />
              <View style={{ flex: 1 }}>
                <GameText size={14} color={colors.inkSoft} weight="bold">
                  Today's puzzle from
                </GameText>
                <GameText size={21} color={theme.primaryDeep} weight="black">
                  {WORLD_BY_ID[challenge.worldId].name}
                </GameText>
              </View>
            </View>
            <Parchment>
              <GameText size={16} color={colors.ink} weight="bold" align="center">
                {challenge.stages[0]?.instructions ?? 'Solve today’s brain teaser!'}
              </GameText>
            </Parchment>
            <View style={styles.rewardRow}>
              <GameText size={15} color={colors.inkSoft} weight="bold">
                Reward:
              </GameText>
              <CoinIcon size={26} />
              <GameText size={18} color={colors.ink} weight="black">
                {DAILY_CHALLENGE_REWARD.coins}
              </GameText>
              <BulbIcon size={26} />
              <GameText size={18} color={colors.ink} weight="black">
                {DAILY_CHALLENGE_REWARD.hints}
              </GameText>
            </View>
            {done ? (
              <>
                <View style={styles.doneBadge}>
                  <CheckIcon size={22} />
                  <GameText size={18} color="#fff" weight="black">
                    Completed today!
                  </GameText>
                </View>
                <GameButton label="Play Again (just for fun)" variant="blue" size="md" onPress={() => router.push(`/game/${challenge.id}`)} />
                <GameText size={13} color={colors.inkSoft} weight="medium" align="center">
                  A brand-new challenge arrives tomorrow.
                </GameText>
              </>
            ) : (
              <GameButton label="Play" variant="green" size="lg" sound="whoosh" onPress={() => router.push(`/game/${challenge.id}`)} />
            )}
          </>
        ) : (
          <GameText size={18} color={colors.inkSoft} weight="bold" align="center">
            Today's challenge is getting ready. Check back soon!
          </GameText>
        )}
      </Panel>

      <Panel style={styles.section}>
        <View style={styles.sectionHead}>
          <StreakFlame streak={save.daily.streak} size={34} />
          <View style={{ flex: 1 }}>
            <GameText size={19} color={colors.ink} weight="black">
              {save.daily.streak} day streak
            </GameText>
            <GameText size={13} color={colors.inkSoft} weight="medium">
              Best: {save.daily.bestStreak} days · Challenges done: {save.daily.challengeDates.length}
            </GameText>
          </View>
        </View>
        <View style={styles.week}>
          {last7.map((d) => (
            <View key={d.key} style={styles.weekDay}>
              <View style={[styles.weekDot, d.done && styles.weekDotDone]}>{d.done ? <CheckIcon size={18} /> : null}</View>
              <GameText size={11} color={colors.inkSoft} weight="bold">
                {d.label}
              </GameText>
            </View>
          ))}
        </View>
      </Panel>

      <Panel style={styles.section}>
        <View style={styles.sectionHead}>
          <MenuArt name="gift" size={40} />
          <GameText size={19} color={colors.ink} weight="black" style={{ flex: 1 }}>
            Daily Login Rewards
          </GameText>
        </View>
        <LoginRewardStrip cycleDay={save.daily.loginCycleDay} claimedToday={!canClaim} />
        {canClaim ? (
          <GameButton
            label={`Collect ${nextReward.coins} coins`}
            variant="yellow"
            sound="coin"
            onPress={() => {
              const r = claimLoginReward();
              if (r) setClaimed(r);
            }}
          />
        ) : (
          <GameText size={14} color={colors.inkSoft} weight="medium" align="center">
            Collected today. Come back tomorrow for {nextReward.coins} coins!
          </GameText>
        )}
      </Panel>

      <RewardModal
        visible={!!claimed}
        title="Daily Reward!"
        art={<MenuArt name="gift" size={80} />}
        rewards={claimed ? [{ kind: 'coin', amount: claimed.coins }, ...(claimed.hints ? [{ kind: 'hint' as const, amount: claimed.hints }] : [])] : []}
        buttonLabel="Collect!"
        onClose={() => setClaimed(null)}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, borderWidth: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.greenDeep,
    borderRadius: radius.pill,
    paddingVertical: 8,
  },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEE6D6',
    borderWidth: 2.5,
    borderColor: colors.parchmentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: { backgroundColor: colors.green, borderColor: colors.greenDeep },
});
