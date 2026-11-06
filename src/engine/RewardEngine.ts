import type { LevelConfig } from '@/types';
import { tierIndex } from './DifficultyEngine';

/**
 * Coins for a level clear.
 * First clear: full reward. Replays: only the coins for newly earned stars + a small replay bonus.
 */
export function calculateCoins(
  level: LevelConfig,
  stars: 1 | 2 | 3,
  previousStars: number,
  firstClear: boolean,
): number {
  const perStar = 5 + tierIndex(level.tier) * 2;
  const bossMult = level.tier === 'boss' ? 3 : 1;
  if (firstClear) return (10 + tierIndex(level.tier) * 4 + stars * perStar) * bossMult;
  const newStars = Math.max(0, stars - previousStars);
  return newStars * perStar * bossMult + 2;
}

/** 7-day login reward cycle (coins). Day 7 also gives 2 hints. */
export const LOGIN_REWARDS: { coins: number; hints: number }[] = [
  { coins: 20, hints: 0 },
  { coins: 30, hints: 0 },
  { coins: 40, hints: 1 },
  { coins: 50, hints: 0 },
  { coins: 60, hints: 1 },
  { coins: 80, hints: 0 },
  { coins: 150, hints: 2 },
];

export const WORLD_CHEST_REWARD = { coins: 300, hints: 3 };
export const DAILY_CHALLENGE_REWARD = { coins: 60, hints: 1 };
export const HINT_PRICE = 25;

/** Brain power: grows with stars, weighted by tier. Shown as "Level N" + progress. */
export function brainPower(levelStars: { tierIdx: number; stars: number }[]): number {
  return levelStars.reduce((sum, l) => sum + l.stars * (10 + l.tierIdx * 5), 0);
}

export function brainLevel(power: number): { level: number; progress: number; nextAt: number } {
  // each level needs 60 more points than the last: 60, 180, 360...
  let level = 1;
  let need = 60;
  let acc = 0;
  while (power >= acc + need) {
    acc += need;
    level++;
    need += 60;
  }
  return { level, progress: (power - acc) / need, nextAt: acc + need };
}
