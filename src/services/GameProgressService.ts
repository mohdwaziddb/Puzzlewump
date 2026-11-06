/**
 * Pure progression logic (no React, no storage) — fully unit-testable.
 * Every function takes a SaveData and returns a NEW SaveData.
 */
import type { CharacterId, LevelConfig, LevelResult, SaveData, WorldId } from '@/types';
import { calculateScore, calculateStars, type PlayStats } from '@/engine/ScoringEngine';
import {
  calculateCoins,
  DAILY_CHALLENGE_REWARD,
  HINT_PRICE,
  LOGIN_REWARDS,
  WORLD_CHEST_REWARD,
} from '@/engine/RewardEngine';
import { LEVELS_BY_WORLD, totalStars } from '@/engine/LevelEngine';
import { ACHIEVEMENTS, isAchieved } from '@/data/achievements';
import { CHARACTERS } from '@/data/characters';

export function applyAchievements(s: SaveData, now = Date.now()): { save: SaveData; unlocked: string[] } {
  let save = s;
  const unlocked: string[] = [];
  // loop: an achievement reward (coins) can unlock another (coins-500)
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (save.achievements[a.id]) continue;
      if (isAchieved(a, save)) {
        save = { ...save, achievements: { ...save.achievements, [a.id]: now }, coins: save.coins + a.reward };
        unlocked.push(a.id);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { save, unlocked };
}

export function applyCharacterUnlocks(s: SaveData): { save: SaveData; unlocked: CharacterId[] } {
  const stars = totalStars(s);
  const unlocked: CharacterId[] = [];
  for (const c of CHARACTERS) {
    if (!s.unlockedCharacters.includes(c.id) && c.isEarned(s, stars)) unlocked.push(c.id);
  }
  if (!unlocked.length) return { save: s, unlocked };
  return { save: { ...s, unlockedCharacters: [...s.unlockedCharacters, ...unlocked] }, unlocked };
}

export function completeLevel(
  s: SaveData,
  level: LevelConfig,
  stats: PlayStats,
  today: string,
): { save: SaveData; result: LevelResult } {
  const isDaily = level.id.startsWith('daily-');
  const stars = calculateStars(level, stats);
  const score = calculateScore(level, stats);
  const prev = s.levels[level.id];
  const firstClear = !prev?.completed;
  let coins: number;
  let save: SaveData = { ...s };

  if (isDaily) {
    const already = s.daily.challengeDates.includes(today);
    coins = already ? 5 : DAILY_CHALLENGE_REWARD.coins;
    save.daily = already
      ? s.daily
      : { ...s.daily, challengeDates: [...s.daily.challengeDates, today].slice(-400) };
    if (!already) save.hints = s.hints + DAILY_CHALLENGE_REWARD.hints;
  } else {
    coins = calculateCoins(level, stars, prev?.stars ?? 0, firstClear);
    save.levels = {
      ...s.levels,
      [level.id]: {
        completed: true,
        stars: Math.max(stars, prev?.stars ?? 0) as 1 | 2 | 3,
        bestScore: Math.max(score, prev?.bestScore ?? 0),
        plays: (prev?.plays ?? 0) + 1,
      },
    };
    save.lastWorld = level.worldId;
  }
  const perfect = stats.mistakes === 0 && stats.hintsUsed === 0 && stars === 3;
  save.coins = s.coins + coins;
  save.stats = {
    ...s.stats,
    levelsPlayed: s.stats.levelsPlayed + 1,
    levelsWon: s.stats.levelsWon + 1,
    mistakes: s.stats.mistakes + stats.mistakes,
    hintsUsed: s.stats.hintsUsed + stats.hintsUsed,
    playSeconds: s.stats.playSeconds + Math.round(stats.timeSec),
    perfectLevels: s.stats.perfectLevels + (perfect ? 1 : 0),
  };

  const worldCompleted: WorldId | null =
    !isDaily && level.number === 30 && firstClear ? level.worldId : null;

  const ch = applyCharacterUnlocks(save);
  const ach = applyAchievements(ch.save);
  return {
    save: ach.save,
    result: {
      levelId: level.id,
      stars,
      score,
      coins,
      mistakes: stats.mistakes,
      hintsUsed: stats.hintsUsed,
      timeSec: Math.round(stats.timeSec),
      firstClear: isDaily ? false : firstClear,
      newBest: !isDaily && score > (prev?.bestScore ?? 0),
      isDaily,
      newAchievements: ach.unlocked,
      unlockedCharacters: ch.unlocked,
      worldCompleted,
    },
  };
}

export function recordFailedAttempt(s: SaveData, stats: PlayStats): SaveData {
  return {
    ...s,
    stats: {
      ...s.stats,
      levelsPlayed: s.stats.levelsPlayed + 1,
      mistakes: s.stats.mistakes + stats.mistakes,
      hintsUsed: s.stats.hintsUsed + stats.hintsUsed,
      playSeconds: s.stats.playSeconds + Math.round(stats.timeSec),
    },
  };
}

/** Uses a hint token, or buys one with coins. Returns null if neither is possible. */
export function spendHint(s: SaveData): { save: SaveData; paidWith: 'token' | 'coins' } | null {
  if (s.hints > 0) return { save: { ...s, hints: s.hints - 1 }, paidWith: 'token' };
  if (s.coins >= HINT_PRICE) return { save: { ...s, coins: s.coins - HINT_PRICE }, paidWith: 'coins' };
  return null;
}

function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** Call on app open. Updates the streak based on the local device date. */
export function registerLogin(s: SaveData, today: string): SaveData {
  const last = s.daily.lastLoginDate;
  if (last === today) return s;
  let streak = 1;
  if (last) {
    const gap = daysBetween(last, today);
    if (gap === 1) streak = s.daily.streak + 1;
    else if (gap <= 0) streak = Math.max(1, s.daily.streak); // clock moved back: keep streak
  }
  const save = {
    ...s,
    daily: { ...s.daily, lastLoginDate: today, streak, bestStreak: Math.max(s.daily.bestStreak, streak) },
  };
  return applyAchievements(save).save;
}

export function canClaimLoginReward(s: SaveData, today: string): boolean {
  return s.daily.lastLoginRewardDate !== today;
}

export function claimLoginReward(
  s: SaveData,
  today: string,
): { save: SaveData; reward: { coins: number; hints: number; day: number } } | null {
  if (!canClaimLoginReward(s, today)) return null;
  const day = s.daily.loginCycleDay % 7;
  const r = LOGIN_REWARDS[day];
  const save: SaveData = {
    ...s,
    coins: s.coins + r.coins,
    hints: s.hints + r.hints,
    daily: { ...s.daily, lastLoginRewardDate: today, loginCycleDay: (day + 1) % 7 },
  };
  return { save: applyAchievements(save).save, reward: { ...r, day } };
}

export function canClaimWorldChest(s: SaveData, worldId: WorldId): boolean {
  return (
    !s.claimedWorldChests.includes(worldId) &&
    LEVELS_BY_WORLD[worldId].length > 0 &&
    !!s.levels[`${worldId}-30`]?.completed
  );
}

export function claimWorldChest(s: SaveData, worldId: WorldId): SaveData | null {
  if (!canClaimWorldChest(s, worldId)) return null;
  const save: SaveData = {
    ...s,
    coins: s.coins + WORLD_CHEST_REWARD.coins,
    hints: s.hints + WORLD_CHEST_REWARD.hints,
    claimedWorldChests: [...s.claimedWorldChests, worldId],
    stats: { ...s.stats, chestsOpened: s.stats.chestsOpened + 1 },
  };
  return applyAchievements(save).save;
}
