import type { LevelConfig, StageConfig, WorldId } from '@/types';
import { seedFor } from '@/engine/rng';
import { tierDefaults, tierForLevel } from '@/engine/DifficultyEngine';

export interface LevelOverrides {
  lives?: number | null; // null = explicitly no lives
  maxHints?: number;
  timeLimitSec?: number | null; // null = explicitly no timer
  parTimeSec?: number;
}

/**
 * Builds a LevelConfig with tier, seed and tier-default lives/hints/timer filled in.
 * World data files call this 30 times (level 30 = boss with 3 stages).
 */
export function makeLevel(
  worldId: WorldId,
  number: number,
  title: string,
  stages: StageConfig[],
  overrides: LevelOverrides = {},
): LevelConfig {
  const tier = tierForLevel(number);
  const d = tierDefaults(tier);
  const lives = overrides.lives === null ? undefined : (overrides.lives ?? d.lives);
  const timeLimitSec =
    overrides.timeLimitSec === null ? undefined : (overrides.timeLimitSec ?? d.timeLimitSec);
  const parTimeSec =
    overrides.parTimeSec ?? Math.round(25 + number * 2 + (stages.length - 1) * 40);
  return {
    id: `${worldId}-${number}`,
    worldId,
    number,
    tier,
    title,
    stages,
    lives,
    timeLimitSec,
    maxHints: overrides.maxHints ?? d.maxHints,
    parTimeSec,
    seed: seedFor(worldId, number),
  };
}
