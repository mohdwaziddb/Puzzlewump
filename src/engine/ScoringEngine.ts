import type { LevelConfig } from '@/types';
import { tierIndex } from './DifficultyEngine';

export interface PlayStats {
  mistakes: number;
  hintsUsed: number;
  timeSec: number;
}

/** 1..3 stars. Completing always gives at least 1 star. */
export function calculateStars(level: LevelConfig, s: PlayStats): 1 | 2 | 3 {
  const fast = s.timeSec <= level.parTimeSec;
  if (s.mistakes === 0 && s.hintsUsed === 0 && fast) return 3;
  // 2 stars: few slips, or flawless but slow
  const penalty = s.mistakes + s.hintsUsed + (fast ? 0 : 1);
  if (penalty <= 2) return 2;
  return 1;
}

export function calculateScore(level: LevelConfig, s: PlayStats): number {
  const base = 500 + tierIndex(level.tier) * 150;
  const timeBonus = Math.max(0, Math.round((level.parTimeSec - s.timeSec) * 4));
  const raw = base + timeBonus - s.mistakes * 60 - s.hintsUsed * 40;
  return Math.max(50, raw);
}
