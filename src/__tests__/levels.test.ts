import {
  ALL_LEVELS,
  LEVELS_BY_WORLD,
  getLevel,
  isLevelUnlocked,
  isWorldUnlocked,
  getDailyChallenge,
  nextLevelId,
} from '@/engine/LevelEngine';
import { GAME_REGISTRY } from '@/games/registry';
import { WORLDS } from '@/data/worlds';
import { defaultSave } from '@/services/StorageService';
import * as GP from '@/services/GameProgressService';
import type { SaveData } from '@/types';

describe('150 levels', () => {
  it('has 5 worlds x 30 levels', () => {
    expect(ALL_LEVELS).toHaveLength(150);
    for (const w of WORLDS) {
      const ls = LEVELS_BY_WORLD[w.id];
      expect(ls.map((l) => l.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(ls[29].tier).toBe('boss');
      expect(ls[29].stages.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('ids unique and every stage has a registered mechanic + instructions', () => {
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(150);
    for (const l of ALL_LEVELS)
      for (const s of l.stages) {
        expect(GAME_REGISTRY[s.gameType]).toBeDefined();
        expect(s.instructions.length).toBeGreaterThan(3);
      }
  });
  it('no duplicated level configs', () => {
    const keys = ALL_LEVELS.map((l) => `${l.worldId}:${JSON.stringify(l.stages)}`);
    expect(new Set(keys).size).toBe(150);
  });
  it('each world uses at least 4 different mechanics', () => {
    for (const w of WORLDS)
      expect(new Set(LEVELS_BY_WORLD[w.id].flatMap((l) => l.stages.map((s) => s.gameType))).size).toBeGreaterThanOrEqual(4);
  });
});

describe('progression', () => {
  const win = (s: SaveData, id: string) =>
    GP.completeLevel(s, getLevel(id)!, { mistakes: 0, hintsUsed: 0, timeSec: 5 }, '2026-01-01').save;

  it('level 1 open, level 2 locked until level 1 done', () => {
    let s = defaultSave();
    expect(isLevelUnlocked(s, getLevel('memory-1')!)).toBe(true);
    expect(isLevelUnlocked(s, getLevel('memory-2')!)).toBe(false);
    s = win(s, 'memory-1');
    expect(isLevelUnlocked(s, getLevel('memory-2')!)).toBe(true);
  });

  it('next world unlocks only after boss; chest claim once', () => {
    let s = defaultSave();
    for (let i = 1; i <= 29; i++) s = win(s, `memory-${i}`);
    expect(isWorldUnlocked(s, 'number')).toBe(false);
    expect(isLevelUnlocked(s, getLevel('number-1')!)).toBe(false);
    s = win(s, 'memory-30');
    expect(isWorldUnlocked(s, 'number')).toBe(true);
    expect(GP.canClaimWorldChest(s, 'memory')).toBe(true);
    const before = s.coins;
    s = GP.claimWorldChest(s, 'memory')!;
    expect(s.coins).toBeGreaterThan(before);
    expect(GP.claimWorldChest(s, 'memory')).toBeNull();
    expect(nextLevelId(getLevel('memory-30')!)).toBe('number-1');
  });

  it('coins: first clear full, replay small; stars keep best', () => {
    const s = defaultSave();
    const r1 = GP.completeLevel(s, getLevel('memory-1')!, { mistakes: 5, hintsUsed: 0, timeSec: 500 }, 'd');
    expect(r1.result.stars).toBe(1);
    expect(r1.result.firstClear).toBe(true);
    const r2 = GP.completeLevel(r1.save, getLevel('memory-1')!, { mistakes: 0, hintsUsed: 0, timeSec: 1 }, 'd');
    expect(r2.result.stars).toBe(3);
    expect(r2.result.firstClear).toBe(false);
    expect(r2.save.levels['memory-1'].stars).toBe(3);
    const r3 = GP.completeLevel(r2.save, getLevel('memory-1')!, { mistakes: 9, hintsUsed: 0, timeSec: 999 }, 'd');
    expect(r3.save.levels['memory-1'].stars).toBe(3);
    expect(r3.result.coins).toBe(2);
  });

  it('daily challenge deterministic per date, recorded separately', () => {
    const a = getDailyChallenge('2026-03-01')!;
    expect(getDailyChallenge('2026-03-01')!.seed).toBe(a.seed);
    expect(getDailyChallenge('2026-03-02')!.seed).not.toBe(a.seed);
    const r = GP.completeLevel(defaultSave(), a, { mistakes: 0, hintsUsed: 0, timeSec: 5 }, '2026-03-01');
    expect(r.save.daily.challengeDates).toContain('2026-03-01');
    expect(r.save.levels[a.id]).toBeUndefined();
  });

  it('achievements and character unlocks', () => {
    let s = defaultSave();
    s = win(s, 'memory-1');
    expect(s.achievements['first-steps']).toBeDefined();
    expect(s.unlockedCharacters).not.toContain('robo');
  });

  it('login reward once per day, cycles', () => {
    const r = GP.claimLoginReward(defaultSave(), '2026-01-01')!;
    expect(r.reward.coins).toBeGreaterThan(0);
    expect(GP.claimLoginReward(r.save, '2026-01-01')).toBeNull();
    expect(GP.claimLoginReward(r.save, '2026-01-02')!.reward.day).toBe(1);
  });
});
