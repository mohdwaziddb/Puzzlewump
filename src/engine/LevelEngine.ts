import type { LevelConfig, SaveData, WorldId } from '@/types';
import { world1Levels } from '@/data/levels/world1';
import { world2Levels } from '@/data/levels/world2';
import { world3Levels } from '@/data/levels/world3';
import { world4Levels } from '@/data/levels/world4';
import { world5Levels } from '@/data/levels/world5';
import { WORLDS } from '@/data/worlds';
import { createRng, hashString } from './rng';
import { tierIndex } from './DifficultyEngine';

export const LEVELS_BY_WORLD: Record<WorldId, LevelConfig[]> = {
  memory: world1Levels,
  number: world2Levels,
  jungle: world3Levels,
  logic: world4Levels,
  treasure: world5Levels,
};

export const ALL_LEVELS: LevelConfig[] = WORLDS.flatMap((w) => LEVELS_BY_WORLD[w.id]);

const BY_ID = new Map(ALL_LEVELS.map((l) => [l.id, l]));

export function getLevel(id: string): LevelConfig | undefined {
  if (id.startsWith('daily-')) return getDailyChallenge(id.slice(6));
  return BY_ID.get(id);
}

export function isWorldUnlocked(save: SaveData, worldId: WorldId): boolean {
  const idx = WORLDS.findIndex((w) => w.id === worldId);
  if (idx <= 0) return true;
  const prev = WORLDS[idx - 1].id;
  return !!save.levels[`${prev}-30`]?.completed;
}

export function isLevelUnlocked(save: SaveData, level: LevelConfig): boolean {
  if (level.id.startsWith('daily-')) return true;
  if (!isWorldUnlocked(save, level.worldId)) return false;
  if (level.number === 1) return true;
  return !!save.levels[`${level.worldId}-${level.number - 1}`]?.completed;
}

/** First unlocked-but-not-completed level in a world (the "current" level), or null if all done. */
export function currentLevelOf(save: SaveData, worldId: WorldId): LevelConfig | null {
  return LEVELS_BY_WORLD[worldId].find((l) => !save.levels[l.id]?.completed) ?? null;
}

export function worldStars(save: SaveData, worldId: WorldId): number {
  return LEVELS_BY_WORLD[worldId].reduce((s, l) => s + (save.levels[l.id]?.stars ?? 0), 0);
}

export function worldCompletedCount(save: SaveData, worldId: WorldId): number {
  return LEVELS_BY_WORLD[worldId].filter((l) => save.levels[l.id]?.completed).length;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((s, l) => s + l.stars, 0);
}

export function levelStarList(save: SaveData) {
  return ALL_LEVELS.map((l) => ({ tierIdx: tierIndex(l.tier), stars: save.levels[l.id]?.stars ?? 0 }));
}

/**
 * Daily challenge for a local date (YYYY-MM-DD): picks a medium-tier stage from a
 * date-seeded world and re-seeds it so the content is new every day.
 */
export function getDailyChallenge(date: string): LevelConfig | undefined {
  if (ALL_LEVELS.length === 0) return undefined;
  const rng = createRng(hashString(`daily:${date}`));
  const pool = ALL_LEVELS.filter((l) => l.number >= 8 && l.number <= 22);
  const src = rng.pick(pool.length ? pool : ALL_LEVELS);
  return {
    ...src,
    id: `daily-${date}`,
    title: 'Daily Challenge',
    seed: hashString(`daily-seed:${date}`),
    lives: undefined,
    timeLimitSec: undefined,
    maxHints: 3,
    stages: [src.stages[0]],
  };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nextLevelId(level: LevelConfig): string | null {
  if (level.id.startsWith('daily-')) return null;
  if (level.number < 30) return `${level.worldId}-${level.number + 1}`;
  const idx = WORLDS.findIndex((w) => w.id === level.worldId);
  return idx < WORLDS.length - 1 ? `${WORLDS[idx + 1].id}-1` : null;
}
