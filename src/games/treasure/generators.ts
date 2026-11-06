/**
 * Pure puzzle generation + validation for Treasure Island (no React).
 * Every generator takes an Rng from createRng(seed) so puzzles are deterministic.
 */
import { createRng, type Rng } from '@/engine/rng';
import { numericChoices, validChoices } from '@/engine/ValidationEngine';
import type { ItemName } from '@/art/items';
import {
  ASYMMETRIC_ITEMS,
  BEACH_ITEMS,
  ROUND_ITEMS,
  findSpot,
  placeAll,
  type SceneData,
  type SceneObject,
  type Spec,
  type Tint,
} from './sceneModel';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sortNum = (a: number[]) => a.slice().sort((x, y) => x - y);

/** Item list of length n drawn from pool, as varied as possible (repeats only when needed). */
function varied(rng: Rng, pool: readonly ItemName[], n: number): ItemName[] {
  const out: ItemName[] = [];
  while (out.length < n) out.push(...rng.shuffle(pool).slice(0, n - out.length));
  return out;
}

/* ================================================================ find-difference */

export type DiffKind = 'missing' | 'extra' | 'color' | 'size' | 'flip' | 'rotate';
export const ALL_DIFF_KINDS: DiffKind[] = ['missing', 'extra', 'color', 'size', 'flip', 'rotate'];

export interface FindDiffParams {
  differences: number;
  objects: number;
  kinds?: DiffKind[];
  /** smaller changes (darker tint, gentler size/rotation change) */
  subtle?: boolean;
}

export interface Difference {
  /** object id in left/right scenes */
  id: string;
  kind: DiffKind;
  x: number;
  y: number;
  size: number;
}

export interface FindDiffPuzzle {
  left: SceneData;
  right: SceneData;
  diffs: Difference[];
}

export const FD_ASPECT = 0.66;
const TINT_HUES = [100, 150, 200, 260];

export function genFindDifference(rng: Rng, p: FindDiffParams): FindDiffPuzzle {
  const n = clamp(Math.round(p.differences), 1, 9);
  const count = clamp(Math.round(p.objects), n + 2, 30);
  const kinds = p.kinds && p.kinds.length ? p.kinds : (['missing', 'extra', 'color'] as DiffKind[]);
  const base = clamp(0.22 - count * 0.0055, 0.11, 0.17);
  const opts = { aspect: FD_ASPECT, yMin: 0.14, yMax: 0.94 };

  // guarantee some asymmetric items so flips are visible
  const wantFlip = kinds.includes('flip') ? n : 0;
  const items = rng.shuffle([
    ...varied(rng, ASYMMETRIC_ITEMS.filter((i) => BEACH_ITEMS.includes(i)), Math.min(wantFlip, count)),
    ...varied(rng, BEACH_ITEMS, count - Math.min(wantFlip, count)),
  ]);
  const specs: Spec[] = items.map((item) => ({
    item,
    size: base * (0.85 + rng.next() * 0.3),
    rotation: rng.int(-14, 14),
    flip: rng.chance(0.5),
  }));
  const left = placeAll(rng, specs, opts, 'o');
  const right: SceneObject[] = left.map((o) => ({ ...o }));
  const diffs: Difference[] = [];
  const used = new Set<string>();
  const order = rng.shuffle(kinds);

  const pickObj = (ok: (o: SceneObject) => boolean) => {
    const cands = rng.shuffle(left.filter((o) => !used.has(o.id) && ok(o)));
    return cands[0] ?? null;
  };

  for (let i = 0; i < n; i++) {
    let kind = order[i % order.length];
    if (kind === 'extra') {
      const occupied = [...left, ...right.filter((o) => o.id.startsWith('x'))];
      const size = base;
      const spot = findSpot(rng, size, occupied, { ...opts, gapFactor: 1.05 });
      if (spot) {
        const id = `x${i}`;
        const item = rng.pick(BEACH_ITEMS);
        right.push({ id, item, x: spot.x, y: spot.y, size, rotation: rng.int(-10, 10), flip: rng.chance(0.5) });
        diffs.push({ id, kind, x: spot.x, y: spot.y, size });
        continue;
      }
      kind = 'missing';
    }
    let target: SceneObject | null = null;
    if (kind === 'flip') target = pickObj((o) => ASYMMETRIC_ITEMS.includes(o.item));
    else if (kind === 'rotate') target = pickObj((o) => !ROUND_ITEMS.includes(o.item));
    if (!target && (kind === 'flip' || kind === 'rotate')) kind = 'color';
    if (!target) target = pickObj(() => true);
    if (!target) break;
    used.add(target.id);
    const idx = right.findIndex((o) => o.id === target!.id);
    const r = right[idx];
    let size = r.size;
    switch (kind) {
      case 'missing':
        right.splice(idx, 1);
        break;
      case 'color': {
        const tint: Tint = { hue: rng.pick(TINT_HUES), brightness: p.subtle ? 0.62 : 0.45 };
        right[idx] = { ...r, tint };
        break;
      }
      case 'size': {
        const f = p.subtle ? 0.7 : 0.58;
        right[idx] = { ...r, size: r.size * f };
        break;
      }
      case 'flip':
        right[idx] = { ...r, flip: !r.flip };
        break;
      case 'rotate': {
        const delta = p.subtle ? rng.pick([70, -70, 110]) : rng.pick([90, -90, 180]);
        right[idx] = { ...r, rotation: r.rotation + delta };
        break;
      }
    }
    size = Math.max(size, r.size);
    diffs.push({ id: target.id, kind, x: target.x, y: target.y, size });
  }

  const variant = rng.int(0, 3);
  return { left: { aspect: FD_ASPECT, objects: left, variant }, right: { aspect: FD_ASPECT, objects: right, variant }, diffs };
}

function sameTint(a?: Tint, b?: Tint) {
  return (!a && !b) || (!!a && !!b && a.hue === b.hue && a.brightness === b.brightness);
}

/** Independent comparison of two scenes: ids whose object differs (added, removed or changed). */
export function compareScenes(a: SceneData, b: SceneData): string[] {
  const out: string[] = [];
  const bm = new Map(b.objects.map((o) => [o.id, o]));
  const am = new Map(a.objects.map((o) => [o.id, o]));
  for (const o of a.objects) {
    const m = bm.get(o.id);
    if (!m) out.push(o.id);
    else if (
      m.item !== o.item ||
      Math.abs(m.x - o.x) > 1e-9 ||
      Math.abs(m.y - o.y) > 1e-9 ||
      Math.abs(m.size - o.size) > 1e-9 ||
      m.rotation !== o.rotation ||
      m.flip !== o.flip ||
      !sameTint(m.tint, o.tint)
    )
      out.push(o.id);
  }
  for (const o of b.objects) if (!am.has(o.id)) out.push(o.id);
  return out;
}

/* ================================================================== hidden-object */

export interface HiddenParams {
  targets: number;
  distractors: number;
  smallScale?: boolean;
}

export interface HiddenPuzzle {
  scene: SceneData;
  /** one object per target item, in strip order */
  targets: { id: string; item: ItemName }[];
}

export const HO_ASPECT = 1.0;

export function genHiddenObject(rng: Rng, p: HiddenParams): HiddenPuzzle {
  const t = clamp(Math.round(p.targets), 1, 8);
  const d = clamp(Math.round(p.distractors), 0, 34);
  const targetItems = rng.sample(BEACH_ITEMS, t);
  const rest = BEACH_ITEMS.filter((i) => !targetItems.includes(i));
  const distractorItems = varied(rng, rest, d);
  const base = clamp(0.2 - (t + d) * 0.0032, 0.1, 0.16);
  const specs: (Spec & { target: boolean })[] = rng.shuffle([
    ...targetItems.map((item) => ({
      item,
      target: true,
      size: base * (p.smallScale ? 0.74 : 1),
      rotation: p.smallScale ? rng.int(-35, 35) : rng.int(-12, 12),
      flip: rng.chance(0.5),
    })),
    ...distractorItems.map((item) => ({
      item,
      target: false,
      size: base * (0.85 + rng.next() * 0.35),
      rotation: rng.int(-20, 20),
      flip: rng.chance(0.5),
    })),
  ]);
  const objects = placeAll(rng, specs, { aspect: HO_ASPECT, yMin: 0.12, yMax: 0.95 }, 'h');
  const targets = targetItems.map((item) => {
    const idx = specs.findIndex((s) => s.target && s.item === item);
    return { id: objects[idx].id, item };
  });
  return { scene: { aspect: HO_ASPECT, objects, variant: rng.int(0, 3) }, targets };
}

/* ================================================================ visual-counting */

export interface CountParams {
  max: number;
  distractorKinds: number;
  rounds: number;
  input?: 'choice' | 'pad';
}

export interface CountRound {
  scene: SceneData;
  target: ItemName;
  answer: number;
  choices: number[];
}

export const COUNT_ASPECT = 0.78;
export const COUNTABLE: ItemName[] = ['shell', 'starfish', 'crab', 'fish', 'gem', 'key', 'anchor', 'parrot', 'coinbag', 'turtle', 'apple', 'banana', 'balloon', 'flower', 'crown'];

export function genCounting(rng: Rng, p: CountParams): CountRound[] {
  const max = clamp(Math.round(p.max), 2, 20);
  const rounds = clamp(Math.round(p.rounds), 1, 8);
  const kinds = clamp(Math.round(p.distractorKinds), 0, 5);
  const min = Math.max(1, Math.ceil(max * 0.4));
  const targets = varied(rng, COUNTABLE, rounds);
  let prev = -1;
  return targets.map((target) => {
    let answer = rng.int(min, max);
    if (answer === prev && max > min) answer = answer === max ? answer - 1 : answer + 1;
    prev = answer;
    const others = rng.sample(
      BEACH_ITEMS.filter((i) => i !== target),
      kinds,
    );
    const specsItems: ItemName[] = Array.from({ length: answer }, () => target);
    for (const o of others) {
      const c = rng.int(1, Math.max(1, Math.ceil(max / 3)));
      for (let k = 0; k < c; k++) specsItems.push(o);
    }
    const total = specsItems.length;
    const base = clamp(0.21 - total * 0.004, 0.1, 0.16);
    const specs: Spec[] = rng.shuffle(specsItems).map((item) => ({
      item,
      size: base * (0.9 + rng.next() * 0.2),
      rotation: rng.int(-18, 18),
      flip: rng.chance(0.5),
    }));
    const objects = placeAll(rng, specs, { aspect: COUNT_ASPECT, yMin: 0.12, yMax: 0.95 }, 'c');
    const choices = sortNum(numericChoices(answer, 4, rng.next, 2).map((v) => (v < 1 ? answer + 3 + v : v)));
    return { scene: { aspect: COUNT_ASPECT, objects, variant: rng.int(0, 3) }, target, answer, choices: dedupe(choices, answer) };
  });
}

function dedupe(choices: number[], answer: number): number[] {
  const s = new Set<number>(choices);
  let k = 1;
  while (s.size < choices.length) s.add(answer + 4 + k++);
  return sortNum(Array.from(s));
}

export function countOf(scene: SceneData, item: ItemName): number {
  return scene.objects.filter((o) => o.item === item).length;
}

/* ================================================================ object-matching */

export interface MatchParams {
  pairs: number;
  rounds: number;
  /** extra silhouettes that match nothing */
  decoys?: number;
  /** silhouettes rotated / mirrored */
  twist?: boolean;
  /** items from the same family (harder to tell apart) */
  similar?: boolean;
}

export interface Silhouette {
  item: ItemName;
  rotation: number;
  flip: boolean;
}

export interface MatchRound {
  items: ItemName[];
  silhouettes: Silhouette[];
}

export const MATCH_FAMILIES: ItemName[][] = [
  ['shell', 'starfish', 'crab', 'fish', 'turtle', 'anchor', 'ship', 'compass'],
  ['apple', 'banana', 'cherry', 'grapes', 'strawberry', 'orange', 'pear', 'watermelon'],
  ['parrot', 'monkey', 'cat', 'dog', 'rabbit', 'owl', 'frog', 'elephant', 'lion'],
  ['key', 'crown', 'gem', 'coinbag', 'bell', 'hat', 'umbrella', 'drum'],
];
const MATCH_ALL: ItemName[] = Array.from(new Set(MATCH_FAMILIES.flat()));

export function genMatching(rng: Rng, p: MatchParams): MatchRound[] {
  const pairs = clamp(Math.round(p.pairs), 1, 5);
  const decoys = clamp(Math.round(p.decoys ?? 0), 0, 4);
  const rounds = clamp(Math.round(p.rounds), 1, 6);
  const out: MatchRound[] = [];
  for (let r = 0; r < rounds; r++) {
    const pool = p.similar ? rng.pick(MATCH_FAMILIES) : MATCH_ALL;
    const chosen = rng.sample(pool, pairs + decoys);
    // if a family is too small, top up from everything
    const extra = rng.sample(
      MATCH_ALL.filter((i) => !chosen.includes(i)),
      pairs + decoys - chosen.length,
    );
    const all = [...chosen, ...extra];
    const items = all.slice(0, pairs);
    const silhouettes = rng.shuffle(all).map((item) => ({
      item,
      rotation: p.twist ? rng.pick([0, 90, -90, 180, 45]) : 0,
      flip: p.twist ? rng.chance(0.5) : false,
    }));
    out.push({ items, silhouettes });
  }
  return out;
}

/** Every item has exactly one matching silhouette. */
export function matchingValid(r: MatchRound): boolean {
  return (
    new Set(r.items).size === r.items.length &&
    r.items.every((it) => r.silhouettes.filter((s) => s.item === it).length === 1)
  );
}

/* ================================================================= treasure-hunt */

export interface HuntParams {
  steps: number;
  maxCoins?: number;
  /** number of tangled paths (3-4) */
  paths?: number;
  /** dig grid size (3-4) */
  grid?: number;
}

export type HuntStep =
  | { kind: 'count'; coins: { x: number; y: number }[]; coinSize: number; answer: number; choices: number[] }
  | { kind: 'key'; keys: number[]; answer: number }
  | { kind: 'path'; landmarks: ItemName[]; perm: number[]; target: number }
  | { kind: 'dig'; size: number; cell: number };

export interface HuntPuzzle {
  steps: HuntStep[];
}

export const LANDMARKS: ItemName[] = ['ship', 'anchor', 'parrot', 'crab', 'turtle', 'tree', 'umbrella', 'compass'];

export function genTreasureHunt(rng: Rng, p: HuntParams): HuntPuzzle {
  const nSteps = clamp(Math.round(p.steps), 2, 4);
  const maxCoins = clamp(Math.round(p.maxCoins ?? 6), 3, 15);
  const nPaths = clamp(Math.round(p.paths ?? 3), 2, 4);
  const grid = clamp(Math.round(p.grid ?? 3), 2, 4);

  const answer = rng.int(Math.max(2, Math.ceil(maxCoins / 2)), maxCoins);
  // coins reuse the scene placer (item name is irrelevant, only spacing matters)
  const coins = placeAll(
    rng,
    Array.from({ length: answer }, () => ({ item: 'coinbag' as ItemName, size: clamp(0.24 - answer * 0.008, 0.13, 0.2) })),
    { aspect: 0.5, yMin: 0, yMax: 1, gapFactor: 1.0 },
    'coin',
  );
  const coinSize = coins[0].size;
  const steps: HuntStep[] = [
    { kind: 'count', coins: coins.map(({ x, y }) => ({ x, y })), coinSize, answer, choices: dedupe(sortNum(numericChoices(answer, 4, rng.next, 2).map((v) => (v < 1 ? answer + 3 : v))), answer) },
    { kind: 'key', keys: rng.shuffle(dedupe(numericChoices(answer, nPaths === 4 ? 4 : 3, rng.next, 3).map((v) => (v < 1 ? answer + 4 : v)), answer)), answer },
  ];
  if (nSteps >= 3) {
    let perm = rng.shuffle(Array.from({ length: nPaths }, (_, i) => i));
    let guard = 0;
    while (perm.some((v, i) => v === i) && guard++ < 50) perm = rng.shuffle(perm);
    steps.push({ kind: 'path', landmarks: rng.sample(LANDMARKS, nPaths), perm, target: rng.int(0, nPaths - 1) });
  }
  if (nSteps >= 4) steps.push({ kind: 'dig', size: grid, cell: rng.int(0, grid * grid - 1) });
  return { steps };
}

/** Correct answer index/value for a hunt step, used by component + tests. */
export function huntStepSolvable(s: HuntStep): boolean {
  switch (s.kind) {
    case 'count':
      return s.coins.length === s.answer && validChoices(s.choices, s.answer);
    case 'key':
      return validChoices(s.keys, s.answer);
    case 'path':
      return (
        new Set(s.perm).size === s.perm.length &&
        s.perm.filter((end) => end === s.target).length === 1 &&
        new Set(s.landmarks).size === s.landmarks.length
      );
    case 'dig':
      return s.cell >= 0 && s.cell < s.size * s.size;
  }
}

/* ---------------------------------------------------------- convenience by seed */

export const genFromSeed = {
  findDifference: (seed: number, p: FindDiffParams) => genFindDifference(createRng(seed), p),
  hidden: (seed: number, p: HiddenParams) => genHiddenObject(createRng(seed), p),
  counting: (seed: number, p: CountParams) => genCounting(createRng(seed), p),
  matching: (seed: number, p: MatchParams) => genMatching(createRng(seed), p),
  hunt: (seed: number, p: HuntParams) => genTreasureHunt(createRng(seed), p),
};
