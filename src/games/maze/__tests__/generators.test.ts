import { world3Levels } from '@/data/levels/world3';
import { ITEM_NAMES } from '@/art/items';
import {
  applyMove,
  expandPushSolution,
  generateHiddenScene,
  generateMaze,
  generatePathPuzzle,
  generatePushPuzzle,
  isPushSolved,
  JUNGLE_ITEMS,
  leafCoverage,
  mazePath,
  mazeRun,
  pushMoveLimit,
  runProgram,
  runsKey,
  SCENE_H,
  SCENE_W,
  solvePush,
  validateMaze,
  type HiddenParams,
  type MazeParams,
  type PathParams,
  type PushParams,
} from '../generators';

const stages = world3Levels.flatMap((level) =>
  level.stages.map((stage, si) => ({ level, stage, si, seed: level.seed + si * 101 })),
);

/** Serialize generated content so we can check two levels are never identical. */
function fingerprint(gameType: string, params: Record<string, unknown>, seed: number): string {
  switch (gameType) {
    case 'maze': {
      const m = generateMaze(seed, params as unknown as MazeParams);
      return `maze:${m.walls.join('')}:${m.start}:${m.goal}:${m.keys}`;
    }
    case 'path-finder': {
      const p = params as unknown as PathParams;
      const rounds = p.rounds ?? 1;
      return `path:${Array.from({ length: rounds }, (_, r) => {
        const z = generatePathPuzzle(seed, p, r);
        return `${z.start}-${z.treasure}-${z.obstacles.map((o) => (o ? o[0] : '.')).join('')}`;
      }).join('|')}`;
    }
    case 'push-puzzle': {
      const z = generatePushPuzzle(seed, params as unknown as PushParams);
      return `push:${z.wall.map((w) => (w ? 1 : 0)).join('')}:${z.pads}:${z.start.crates}:${z.start.player}`;
    }
    case 'jungle-hidden': {
      const s = generateHiddenScene(seed, params as unknown as HiddenParams);
      return `hidden:${s.items.map((i) => `${i.name}@${i.x},${i.y}`).join(';')}`;
    }
  }
  return 'unknown';
}

describe('world 3 level data', () => {
  it('has exactly 30 jungle levels with a 3-stage boss', () => {
    expect(world3Levels).toHaveLength(30);
    world3Levels.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
      expect(l.worldId).toBe('jungle');
      expect(l.parTimeSec).toBeGreaterThan(0);
      if (l.timeLimitSec) expect(l.timeLimitSec).toBeGreaterThan(l.parTimeSec);
    });
    expect(world3Levels[29].stages).toHaveLength(3);
    expect(new Set(world3Levels[29].stages.map((s) => s.gameType)).size).toBe(3);
    world3Levels.slice(0, 29).forEach((l) => expect(l.stages).toHaveLength(1));
  });

  it('uses only jungle mechanics and rotates them', () => {
    const types = world3Levels.flatMap((l) => l.stages.map((s) => s.gameType));
    types.forEach((t) => expect(['maze', 'path-finder', 'push-puzzle', 'jungle-hidden']).toContain(t));
    for (let i = 1; i < 29; i++) expect(world3Levels[i].stages[0].gameType).not.toBe(world3Levels[i - 1].stages[0].gameType);
  });

  it('maze sizes grow from 5x5 to 13x13', () => {
    const sizes = world3Levels
      .filter((l) => l.number < 30)
      .flatMap((l) => l.stages)
      .filter((s) => s.gameType === 'maze')
      .map((s) => (s.params as { size: number }).size);
    expect(sizes[0]).toBe(5);
    expect(Math.max(...sizes)).toBe(13);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
  });

  it('no two levels generate identical content', () => {
    const prints = world3Levels.map((l) =>
      l.stages.map((s, si) => fingerprint(s.gameType, s.params, l.seed + si * 101)).join('#'),
    );
    expect(new Set(prints).size).toBe(30);
  });

  it('generation is deterministic', () => {
    for (const { stage, seed } of stages)
      expect(fingerprint(stage.gameType, stage.params, seed)).toBe(fingerprint(stage.gameType, stage.params, seed));
  });
});

describe('maze', () => {
  const mazeStages = stages.filter((s) => s.stage.gameType === 'maze');
  it.each(mazeStages.map((s) => [s.level.id, s] as const))('%s is a connected perfect maze with a path', (_id, s) => {
    const p = s.stage.params as unknown as MazeParams;
    const m = generateMaze(s.seed, p);
    expect(m.size).toBe(p.size);
    expect(validateMaze(m)).toBeNull();
    const path = mazePath(m, m.start, m.goal);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(m.size);
    expect(m.keys).toHaveLength(p.keys ?? 0);
    expect(new Set(m.keys).size).toBe(m.keys.length);
    // every gem is reachable
    m.keys.forEach((k) => expect(mazePath(m, m.start, k)).not.toBeNull());
  });

  it('corridor runs never pass through walls', () => {
    const m = generateMaze(1234, { size: 9 });
    for (let i = 0; i < 81; i++)
      for (const d of ['U', 'D', 'L', 'R'] as const) {
        const run = mazeRun(m, i, d, new Set([m.goal]));
        let prev = i;
        for (const c of run) {
          expect(mazePath(m, prev, c)!.length).toBe(2);
          prev = c;
        }
      }
  });
});

describe('path finder', () => {
  const pathStages = stages.filter((s) => s.stage.gameType === 'path-finder');
  it.each(pathStages.map((s) => [s.level.id, s] as const))('%s has exactly one correct answer per round', (_id, s) => {
    const p = s.stage.params as unknown as PathParams;
    for (let r = 0; r < (p.rounds ?? 1); r++) {
      const z = generatePathPuzzle(s.seed, p, r);
      expect(z.obstacles[z.start]).toBeNull();
      expect(z.obstacles[z.treasure]).toBeNull();
      expect(z.obstacles.filter(Boolean)).toHaveLength(p.obstacles ?? 0);
      expect(z.solution.length).toBe(p.steps);
      const sol = runProgram(z, z.solution);
      expect(sol.crashAt).toBe(-1);
      expect(sol.reachedAt).toBe(z.solution.length - 1);
      expect(z.choices).toHaveLength(4);
      expect(new Set(z.choices.map((c) => c.key)).size).toBe(4);
      const winners = z.choices.filter((c) => runProgram(z, c.dirs).reachedAt >= 0);
      expect(winners).toHaveLength(1);
      expect(winners[0].key).toBe(z.correctKey);
      expect(runsKey(winners[0].dirs)).toBe(z.correctKey);
    }
  });
});

describe('push puzzle', () => {
  const pushStages = stages.filter((s) => s.stage.gameType === 'push-puzzle');
  it.each(pushStages.map((s) => [s.level.id, s] as const))('%s is BFS-solvable within the move limit and not pre-solved', (_id, s) => {
    const p = s.stage.params as unknown as PushParams;
    const z = generatePushPuzzle(s.seed, p);
    expect(z.start.crates).toHaveLength(p.crates);
    expect(z.pads).toHaveLength(p.crates);
    expect(isPushSolved(z, z.start)).toBe(false);
    expect(z.wall[z.start.player]).toBe(false);
    z.start.crates.forEach((c) => expect(z.wall[c]).toBe(false));
    const sol = solvePush(z, z.start);
    expect(sol).not.toBeNull();
    expect(sol!.length).toBe(z.minPushes);
    expect(z.minPushes).toBeGreaterThanOrEqual(p.crates);
    const moves = expandPushSolution(z, z.start, sol!);
    expect(moves).not.toBeNull();
    expect(moves!.length).toBeLessThanOrEqual(pushMoveLimit(z));
    let st = z.start;
    for (const d of moves!) {
      const r = applyMove(z, st, d);
      expect(r.kind).not.toBe('blocked');
      st = r.state;
    }
    expect(isPushSolved(z, st)).toBe(true);
  });
});

describe('jungle hidden', () => {
  it('item pool only uses real item names', () => {
    JUNGLE_ITEMS.forEach((n) => expect(ITEM_NAMES).toContain(n));
  });
  const hiddenStages = stages.filter((s) => s.stage.gameType === 'jungle-hidden');
  it.each(hiddenStages.map((s) => [s.level.id, s] as const))('%s targets exist and are tappable', (_id, s) => {
    const p = s.stage.params as unknown as HiddenParams;
    const scene = generateHiddenScene(s.seed, p);
    expect(scene.targetIds).toHaveLength(p.targets);
    expect(scene.items).toHaveLength(p.targets + p.distractors);
    const targets = scene.items.filter((i) => i.target);
    expect(new Set(targets.map((t) => t.name)).size).toBe(p.targets);
    // distractors never share a name with a target (otherwise a "wrong" tap would be confusing)
    scene.items.filter((i) => !i.target).forEach((d) => expect(targets.map((t) => t.name)).not.toContain(d.name));
    // phone-sized scene: 1 unit ~ 3.2px on a 320px wide area
    const px = 320 / SCENE_W;
    for (const t of targets) {
      expect(t.size * px).toBeGreaterThanOrEqual(36);
      expect(t.x - t.size / 2).toBeGreaterThanOrEqual(0);
      expect(t.x + t.size / 2).toBeLessThanOrEqual(SCENE_W);
      expect(t.y - t.size / 2).toBeGreaterThanOrEqual(0);
      expect(t.y + t.size / 2).toBeLessThanOrEqual(SCENE_H);
      expect(leafCoverage(t)).toBeLessThan(0.5);
      for (const o of scene.items) if (o !== t) expect(Math.hypot(o.x - t.x, o.y - t.y)).toBeGreaterThanOrEqual((o.size + t.size) / 2);
    }
  });
});
