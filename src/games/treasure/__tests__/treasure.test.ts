import { createRng } from '@/engine/rng';
import { validChoices } from '@/engine/ValidationEngine';
import { world5Levels } from '@/data/levels/world5';
import type { StageConfig } from '@/types';
import {
  compareScenes,
  countOf,
  genCounting,
  genFindDifference,
  genHiddenObject,
  genMatching,
  genTreasureHunt,
  huntStepSolvable,
  matchingValid,
  type CountParams,
  type FindDiffParams,
  type HiddenParams,
  type HuntParams,
  type MatchParams,
} from '../generators';
import { hitTest, wellSpaced, type SceneData } from '../sceneModel';

const stages: { level: number; idx: number; stage: StageConfig; seed: number }[] = [];
for (const lv of world5Levels)
  lv.stages.forEach((stage, idx) => stages.push({ level: lv.number, idx, stage, seed: lv.seed + idx * 101 }));

const inBounds = (s: SceneData) =>
  s.objects.every((o) => o.x > 0 && o.x < 1 && o.y > 0 && o.y < 1 && o.size > 0.05);

describe('world 5 level data', () => {
  it('has 30 levels, level 30 is a 3-stage boss mixing mechanics', () => {
    expect(world5Levels).toHaveLength(30);
    world5Levels.forEach((l, i) => expect(l.number).toBe(i + 1));
    const boss = world5Levels[29];
    expect(boss.tier).toBe('boss');
    expect(boss.stages).toHaveLength(3);
    expect(new Set(boss.stages.map((s) => s.gameType)).size).toBe(3);
    world5Levels.slice(0, 29).forEach((l) => expect(l.stages).toHaveLength(1));
  });

  it('no two levels are identical', () => {
    const keys = world5Levels.map((l) => JSON.stringify(l.stages));
    expect(new Set(keys).size).toBe(30);
    expect(new Set(world5Levels.map((l) => l.seed)).size).toBe(30);
    expect(new Set(world5Levels.map((l) => l.title)).size).toBe(30);
  });

  it('uses every treasure mechanic and sane par times', () => {
    const types = new Set(world5Levels.flatMap((l) => l.stages.map((s) => s.gameType)));
    expect([...types].sort()).toEqual(['find-difference', 'hidden-object', 'object-matching', 'treasure-hunt', 'visual-counting']);
    world5Levels.forEach((l) => {
      expect(l.parTimeSec).toBeGreaterThanOrEqual(20);
      expect(l.parTimeSec).toBeLessThanOrEqual(300);
    });
  });
});

describe.each(stages)('level $level stage $idx', ({ stage, seed }) => {
  it(`${stage.gameType} is valid and solvable`, () => {
    switch (stage.gameType) {
      case 'find-difference': {
        const p = stage.params as unknown as FindDiffParams;
        const z = genFindDifference(createRng(seed), p);
        expect(z.diffs).toHaveLength(p.differences);
        expect(new Set(z.diffs.map((d) => d.id)).size).toBe(p.differences);
        // independent detection: exactly the listed objects differ
        expect(compareScenes(z.left, z.right).sort()).toEqual(z.diffs.map((d) => d.id).sort());
        for (const d of z.diffs) {
          const l = z.left.objects.find((o) => o.id === d.id);
          const r = z.right.objects.find((o) => o.id === d.id);
          if (d.kind === 'missing') expect(l && !r).toBeTruthy();
          else if (d.kind === 'extra') expect(!l && r).toBeTruthy();
          else {
            expect(l && r).toBeTruthy();
            if (d.kind === 'color') expect(r!.tint).toBeDefined();
            if (d.kind === 'size') expect(r!.size).toBeLessThan(l!.size);
            if (d.kind === 'flip') expect(r!.flip).toBe(!l!.flip);
            if (d.kind === 'rotate') expect(Math.abs(r!.rotation - l!.rotation)).toBeGreaterThanOrEqual(45);
          }
        }
        // differences are far enough apart to tap unambiguously (in a 340px wide scene)
        for (let i = 0; i < z.diffs.length; i++)
          for (let j = i + 1; j < z.diffs.length; j++) {
            const a = z.diffs[i];
            const b = z.diffs[j];
            expect(Math.hypot(a.x - b.x, (a.y - b.y) * z.left.aspect) * 340).toBeGreaterThan(24);
          }
        expect(wellSpaced(z.left.objects, z.left.aspect)).toBe(true);
        expect(inBounds(z.left) && inBounds(z.right)).toBe(true);
        expect(z.left.objects).toHaveLength(p.objects);
        break;
      }
      case 'hidden-object': {
        const p = stage.params as unknown as HiddenParams;
        const z = genHiddenObject(createRng(seed), p);
        expect(z.targets).toHaveLength(p.targets);
        expect(z.scene.objects).toHaveLength(p.targets + p.distractors);
        for (const t of z.targets) {
          expect(countOf(z.scene, t.item)).toBe(1);
          const o = z.scene.objects.find((x) => x.id === t.id)!;
          expect(o.item).toBe(t.item);
          // tapping its centre selects it
          const W = 340;
          expect(hitTest(z.scene.objects, o.x * W, o.y * W * z.scene.aspect, W, z.scene.aspect)?.id).toBe(o.id);
        }
        expect(wellSpaced(z.scene.objects, z.scene.aspect)).toBe(true);
        expect(inBounds(z.scene)).toBe(true);
        break;
      }
      case 'visual-counting': {
        const p = stage.params as unknown as CountParams;
        const rounds = genCounting(createRng(seed), p);
        expect(rounds).toHaveLength(p.rounds);
        for (const r of rounds) {
          expect(countOf(r.scene, r.target)).toBe(r.answer);
          expect(r.answer).toBeGreaterThanOrEqual(1);
          expect(r.answer).toBeLessThanOrEqual(p.max);
          expect(validChoices(r.choices, r.answer)).toBe(true);
          expect(r.choices.every((c) => c >= 1)).toBe(true);
          const kinds = new Set(r.scene.objects.map((o) => o.item));
          expect(kinds.size).toBe(1 + p.distractorKinds);
          expect(wellSpaced(r.scene.objects, r.scene.aspect)).toBe(true);
        }
        break;
      }
      case 'object-matching': {
        const p = stage.params as unknown as MatchParams;
        const rounds = genMatching(createRng(seed), p);
        expect(rounds).toHaveLength(p.rounds);
        for (const r of rounds) {
          expect(r.items).toHaveLength(p.pairs);
          expect(r.silhouettes).toHaveLength(p.pairs + (p.decoys ?? 0));
          expect(matchingValid(r)).toBe(true);
          expect(new Set(r.silhouettes.map((s) => s.item)).size).toBe(r.silhouettes.length);
        }
        break;
      }
      case 'treasure-hunt': {
        const p = stage.params as unknown as HuntParams;
        const z = genTreasureHunt(createRng(seed), p);
        expect(z.steps).toHaveLength(p.steps);
        z.steps.forEach((s) => expect(huntStepSolvable(s)).toBe(true));
        const count = z.steps[0];
        const key = z.steps[1];
        expect(count.kind).toBe('count');
        expect(key.kind).toBe('key');
        if (count.kind === 'count' && key.kind === 'key') expect(key.answer).toBe(count.answer);
        break;
      }
      default:
        throw new Error(`unexpected game type ${stage.gameType}`);
    }
  });

  it('is deterministic for the same seed', () => {
    const gen = {
      'find-difference': genFindDifference,
      'hidden-object': genHiddenObject,
      'visual-counting': genCounting,
      'object-matching': genMatching,
      'treasure-hunt': genTreasureHunt,
    } as Record<string, (r: ReturnType<typeof createRng>, p: never) => unknown>;
    const f = gen[stage.gameType];
    expect(JSON.stringify(f(createRng(seed), stage.params as never))).toBe(JSON.stringify(f(createRng(seed), stage.params as never)));
  });
});

describe('generators are robust across many seeds', () => {
  it('find-difference always yields the requested count', () => {
    for (let s = 1; s < 120; s++) {
      const z = genFindDifference(createRng(s), { differences: 7, objects: 20, kinds: ['missing', 'extra', 'color', 'size', 'flip', 'rotate'] });
      expect(z.diffs).toHaveLength(7);
      expect(compareScenes(z.left, z.right)).toHaveLength(7);
    }
  });
  it('hunt paths always have a single right answer', () => {
    for (let s = 1; s < 120; s++) {
      const z = genTreasureHunt(createRng(s), { steps: 4, maxCoins: 15, paths: 4, grid: 4 });
      z.steps.forEach((st) => expect(huntStepSolvable(st)).toBe(true));
    }
  });
});
