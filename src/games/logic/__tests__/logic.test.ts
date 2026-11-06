/**
 * Logic Galaxy: every level/stage must have exactly one correct option, verified with
 * checkers written independently of the generators.
 */
import { createRng } from '@/engine/rng';
import { ITEMS } from '@/art/items';
import { world4Levels } from '@/data/levels/world4';
import {
  genMissingRounds,
  genOddRounds,
  genPatternRounds,
  genRotationRounds,
  type MissingParams,
  type OddParams,
  type Option,
  type PatternParams,
  type RotationParams,
  type ShapeDesc,
} from '../generators';

/* ---------------------------------------------------- independent helpers */

const TURNABLE = new Set(['arrow', 'moon', 'heart', 'triangle', 'lblock']);
const FEATURES = ['kind', 'color', 'size', 'fill', 'count', 'rotation'] as const;
type Feature = (typeof FEATURES)[number];

function feat(d: ShapeDesc, f: Feature): string | number {
  if (f === 'rotation') return TURNABLE.has(d.kind) ? ((d.rotation % 360) + 360) % 360 : 0;
  return d[f];
}
function look(d: ShapeDesc): string {
  const cells = d.cells ? canon(d.cells.map(([x, y]) => [x, y])) : '';
  return FEATURES.map((f) => String(feat(d, f))).join('/') + '#' + cells;
}
function canon(cells: number[][]): string {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([x, y]) => [x - mx, y - my])
    .map(([x, y]) => `${x}:${y}`)
    .sort()
    .join(' ');
}
const turn = (cells: number[][]) => cells.map(([x, y]) => [y, -x]);
const flip = (cells: number[][]) => cells.map(([x, y]) => [-x, y]);
function allTurns(cells: number[][]): string[] {
  const out: string[] = [];
  let c = cells;
  for (let i = 0; i < 4; i++) {
    out.push(canon(c));
    c = turn(c);
  }
  return out;
}

function uniqueOptions(opts: Option[]) {
  const keys = opts.map((o) => o.key);
  expect(new Set(keys).size).toBe(keys.length);
  const looks = opts.map((o) => (o.item ? `item:${o.item}` : look(o.shape!)));
  expect(new Set(looks).size).toBe(looks.length);
}

/** Predict one feature at `gap` from the visible values: repeating period and/or steady step. */
function predictFeature(vals: (string | number | null)[], f: Feature): string | number | null {
  const n = vals.length;
  const gap = vals.indexOf(null);
  const preds: (string | number)[] = [];
  // repeating: the smallest period seen at least twice over
  for (let p = 1; p * 2 <= n; p++) {
    let ok = true;
    const byRes = new Map<number, string | number>();
    vals.forEach((v, i) => {
      if (v === null) return;
      const r = i % p;
      if (byRes.has(r) && byRes.get(r) !== v) ok = false;
      byRes.set(r, v);
    });
    if (ok && byRes.has(gap % p)) {
      preds.push(byRes.get(gap % p)!);
      break;
    }
  }
  // steady step (numbers only)
  if (f === 'count' || f === 'rotation') {
    const known = vals.map((v, i) => [i, v] as const).filter((x) => x[1] !== null) as [number, number][];
    const steps = f === 'rotation' ? [0, 90, 180, 270] : [-3, -2, -1, 0, 1, 2, 3];
    const ok = steps.filter((d) =>
      known.every(([i, v]) => {
        const v0 = known[0][1] - d * known[0][0];
        const expect = v0 + d * i;
        return f === 'rotation' ? ((expect % 360) + 360) % 360 === v : expect === v;
      }),
    );
    if (ok.length === 1) {
      const d = ok[0];
      const v = known[0][1] + d * (gap - known[0][0]);
      preds.push(f === 'rotation' ? ((v % 360) + 360) % 360 : v);
    }
  }
  if (!preds.length) return null;
  expect(new Set(preds).size).toBe(1); // the two readings must agree
  return preds[0];
}

function checkPattern(p: PatternParams, seed: number) {
  const rounds = genPatternRounds(createRng(seed), p);
  expect(rounds.length).toBe(p.rounds ?? 5);
  for (const r of rounds) {
    uniqueOptions(r.options);
    const pred: Partial<Record<Feature, string | number>> = {};
    for (const f of FEATURES) {
      const v = predictFeature(
        r.seq.map((s, i) => (i === r.gapIndex ? null : feat(s, f))),
        f,
      );
      expect(v).not.toBeNull();
      pred[f] = v!;
    }
    const matching = r.options.filter((o) => FEATURES.every((f) => feat(o.shape!, f) === pred[f]));
    expect(matching.length).toBe(1);
    expect(matching[0].key).toBe(r.answerKey);
  }
}

function checkOdd(p: OddParams, seed: number) {
  const rounds = genOddRounds(createRng(seed), p);
  for (const r of rounds) {
    expect(r.options.length).toBe(p.count);
    expect(new Set(r.options.map((o) => o.key)).size).toBe(p.count);
    const candidates = new Set<string>();
    const lists: (string | number)[][] = r.options[0].item
      ? [r.options.map((o) => ITEMS.find((i) => i.name === o.item)!.category)]
      : (['kind', 'color', 'size', 'fill', 'count'] as Feature[]).map((f) => r.options.map((o) => feat(o.shape!, f)));
    if (r.options[0].item) expect(new Set(r.options.map((o) => o.item)).size).toBe(p.count);
    for (const vals of lists) {
      vals.forEach((v, i) => {
        const others = vals.filter((_, j) => j !== i);
        if (others.every((o) => o === others[0]) && others[0] !== v) candidates.add(r.options[i].key);
      });
    }
    expect([...candidates]).toEqual([r.answerKey]);
  }
}

function checkRotation(p: RotationParams, seed: number) {
  const rounds = genRotationRounds(createRng(seed), p);
  for (const r of rounds) {
    expect(r.options.length).toBe(p.options);
    uniqueOptions(r.options);
    const t = r.target.cells!.map(([x, y]) => [x, y]);
    expect(t.length).toBe(p.cells);
    const turns = new Set(allTurns(t));
    expect(turns.size).toBeGreaterThan(1);
    const mirrored = new Set(allTurns(flip(t)));
    if (p.allowMirrorDistractors) {
      // chiral: no mirror image equals any rotation
      for (const m of mirrored) expect(turns.has(m)).toBe(false);
    }
    const matching = r.options.filter((o) => turns.has(canon(o.shape!.cells!.map(([x, y]) => [x, y]))));
    expect(matching.length).toBe(1);
    expect(matching[0].key).toBe(r.answerKey);
    // the answer is really turned (does not look identical to the target)
    expect(canon(matching[0].shape!.cells!.map(([x, y]) => [x, y]))).not.toBe(canon(t));
    for (const o of r.options) {
      expect(o.shape!.cells!.length).toBe(p.cells);
      expect(o.shape!.color).toBe(r.target.color);
    }
    if (p.allowMirrorDistractors) {
      expect(r.options.some((o) => mirrored.has(canon(o.shape!.cells!.map(([x, y]) => [x, y]))))).toBe(true);
    }
  }
}

function predictCell(grid: (string | number | null)[]): (string | number)[] {
  const at = (r: number, c: number) => grid[r * 3 + c];
  const mi = grid.indexOf(null);
  const mr = Math.floor(mi / 3);
  const mc = mi % 3;
  const preds: (string | number)[] = [];
  for (const byRow of [true, false]) {
    const line = (k: number) => [0, 1, 2].map((j) => (byRow ? at(k, j) : at(j, k)));
    const mine = byRow ? mr : mc;
    const full = [0, 1, 2].filter((k) => k !== mine).map(line) as (string | number)[][];
    const own = line(mine).filter((v) => v !== null) as (string | number)[];
    // constant lines
    if (full.every((l) => l.every((v) => v === l[0])) && own[0] === own[1]) preds.push(own[0]);
    // each line holds the same three different values
    const set = (l: (string | number)[]) => [...new Set(l)].map(String).sort().join(',');
    if (full.every((l) => new Set(l).size === 3 && set(l) === set(full[0])) && own[0] !== own[1]) {
      const rest = full[0].filter((v) => !own.includes(v));
      if (rest.length === 1) preds.push(rest[0]);
    }
  }
  return preds;
}

function checkMissing(p: MissingParams, seed: number) {
  const rounds = genMissingRounds(createRng(seed), p);
  for (const r of rounds) {
    expect(r.grid.length).toBe(9);
    if (p.missing !== 'any') expect(r.missingIndex).toBe(8);
    uniqueOptions(r.options);
    const pred: Partial<Record<Feature, string | number>> = {};
    for (const f of FEATURES) {
      const ps = predictCell(r.grid.map((s, i) => (i === r.missingIndex ? null : feat(s, f))));
      expect(ps.length).toBeGreaterThan(0);
      expect(new Set(ps).size).toBe(1);
      pred[f] = ps[0];
    }
    const matching = r.options.filter((o) => FEATURES.every((f) => feat(o.shape!, f) === pred[f]));
    expect(matching.length).toBe(1);
    expect(matching[0].key).toBe(r.answerKey);
  }
}

/* ------------------------------------------------------------------ tests */

describe('world 4 levels', () => {
  it('has 30 logic levels with a 3-stage boss', () => {
    expect(world4Levels).toHaveLength(30);
    world4Levels.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
      expect(l.worldId).toBe('logic');
      expect(l.stages.length).toBe(i === 29 ? 3 : 1);
      if (l.timeLimitSec) expect(l.parTimeSec).toBeLessThan(l.timeLimitSec);
    });
    const kinds = new Set(world4Levels[29].stages.map((s) => s.gameType));
    expect(kinds.size).toBe(3);
  });

  it('uses every mechanic and no two levels are identical', () => {
    const types = new Set(world4Levels.flatMap((l) => l.stages.map((s) => s.gameType)));
    expect([...types].sort()).toEqual(['missing-piece', 'odd-one-out', 'pattern', 'shape-rotation']);
    const sigs = world4Levels.map((l) => JSON.stringify(l.stages));
    expect(new Set(sigs).size).toBe(30);
    expect(new Set(world4Levels.map((l) => l.title)).size).toBe(30);
  });

  for (const level of world4Levels) {
    level.stages.forEach((stage, si) => {
      it(`${level.id} stage ${si + 1} (${stage.gameType}) has exactly one right answer`, () => {
        const seed = level.seed + si * 101;
        switch (stage.gameType) {
          case 'pattern':
            return checkPattern(stage.params as unknown as PatternParams, seed);
          case 'odd-one-out':
            return checkOdd(stage.params as unknown as OddParams, seed);
          case 'shape-rotation':
            return checkRotation(stage.params as unknown as RotationParams, seed);
          case 'missing-piece':
            return checkMissing(stage.params as unknown as MissingParams, seed);
          default:
            throw new Error(`unexpected ${stage.gameType}`);
        }
      });
    });
  }

  it('stays valid across many random seeds (robustness)', () => {
    for (let s = 1; s <= 40; s++) {
      for (const level of world4Levels) {
        const st = level.stages[s % level.stages.length];
        const seed = s * 7777 + level.number;
        if (st.gameType === 'pattern') checkPattern(st.params as unknown as PatternParams, seed);
        if (st.gameType === 'odd-one-out') checkOdd(st.params as unknown as OddParams, seed);
        if (st.gameType === 'shape-rotation') checkRotation(st.params as unknown as RotationParams, seed);
        if (st.gameType === 'missing-piece') checkMissing(st.params as unknown as MissingParams, seed);
      }
    }
  });
});
