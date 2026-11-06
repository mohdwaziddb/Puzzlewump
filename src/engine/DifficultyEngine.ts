import type { Tier } from '@/types';

export const TIER_ORDER: Tier[] = ['beginner', 'easy', 'medium', 'challenging', 'hard', 'expert', 'boss'];

export const TIER_LABEL: Record<Tier, string> = {
  beginner: 'Beginner',
  easy: 'Easy',
  medium: 'Medium',
  challenging: 'Challenging',
  hard: 'Hard',
  expert: 'Expert',
  boss: 'World Boss',
};

export function tierForLevel(n: number): Tier {
  if (n >= 30) return 'boss';
  if (n >= 26) return 'expert';
  if (n >= 21) return 'hard';
  if (n >= 16) return 'challenging';
  if (n >= 11) return 'medium';
  if (n >= 6) return 'easy';
  return 'beginner';
}

/** 0 (beginner) .. 6 (boss) */
export function tierIndex(t: Tier): number {
  return TIER_ORDER.indexOf(t);
}

/** Smooth 0..1 difficulty within the world, useful for interpolating params. */
export function difficulty01(levelNumber: number): number {
  return Math.min(1, Math.max(0, (levelNumber - 1) / 29));
}

/** Linear interpolation of an integer parameter by level number. */
export function lerpInt(levelNumber: number, from: number, to: number): number {
  return Math.round(from + (to - from) * difficulty01(levelNumber));
}

/** Default host settings per tier. Levels may override. Timers only from "hard" up, and generous. */
export function tierDefaults(t: Tier): { lives?: number; maxHints: number; timeLimitSec?: number } {
  switch (t) {
    case 'beginner':
      return { maxHints: 3 };
    case 'easy':
      return { maxHints: 3 };
    case 'medium':
      return { lives: 5, maxHints: 3 };
    case 'challenging':
      return { lives: 4, maxHints: 2 };
    case 'hard':
      return { lives: 3, maxHints: 2, timeLimitSec: 180 };
    case 'expert':
      return { lives: 3, maxHints: 2, timeLimitSec: 150 };
    case 'boss':
      return { lives: 5, maxHints: 3, timeLimitSec: 300 };
  }
}
