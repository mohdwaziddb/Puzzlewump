/**
 * Logic Galaxy — pure puzzle generation (no React).
 * Every puzzle is built from the same ShapeDesc model so attribute-based rules
 * (pattern, odd-one-out, matrices) share one vocabulary. Polyominoes ('poly') power rotation puzzles.
 */
import type { Rng } from '@/engine/rng';
import { ITEMS, type ItemName } from '@/art/items';

/* ------------------------------------------------------------------ model */

export type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'pentagon'
  | 'heart'
  | 'diamond'
  | 'moon'
  | 'cross'
  | 'arrow'
  | 'lblock'
  | 'poly';

export const BASIC_KINDS: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'hexagon', 'heart', 'diamond', 'moon', 'cross', 'pentagon'];
/** Kinds whose 90 degree turns all look different. */
export const TURN_KINDS: ShapeKind[] = ['arrow', 'moon', 'heart', 'triangle', 'lblock'];
export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type ShapeColor = (typeof COLORS)[number];
export const SIZES = ['s', 'm', 'l'] as const;
export type ShapeSize = (typeof SIZES)[number];
export const FILLS = ['solid', 'striped', 'dotted', 'outline'] as const;
export type ShapeFill = (typeof FILLS)[number];
export const ROTATIONS = [0, 90, 180, 270];

export type Cell = [number, number];

export interface ShapeDesc {
  kind: ShapeKind;
  color: ShapeColor;
  size: ShapeSize;
  fill: ShapeFill;
  /** degrees, multiple of 90 (only visible for TURN_KINDS) */
  rotation: number;
  /** how many copies are drawn in the tile (1..6) */
  count: number;
  /** polyomino cells when kind === 'poly' */
  cells?: Cell[];
}

export type Attr = 'kind' | 'color' | 'size' | 'fill' | 'count' | 'rotation';
export const ATTRS: Attr[] = ['kind', 'color', 'size', 'fill', 'count', 'rotation'];

/** A multiple-choice option: a shape or an item illustration. */
export interface Option {
  key: string;
  shape?: ShapeDesc;
  item?: ItemName;
}

export interface ChoiceRound {
  options: Option[];
  answerKey: string;
}

/* ---------------------------------------------------------------- helpers */

export function visibleRotation(d: ShapeDesc): number {
  if (d.kind === 'poly' || !TURN_KINDS.includes(d.kind)) return 0;
  return ((d.rotation % 360) + 360) % 360;
}

/** Visual identity of a shape (two descs with the same key look the same). */
export function shapeKey(d: ShapeDesc): string {
  const cells = d.kind === 'poly' && d.cells ? polyKey(d.cells) : '';
  return `${d.kind}|${d.color}|${d.size}|${d.fill}|${d.count}|${visibleRotation(d)}|${cells}`;
}

export function attrValue(d: ShapeDesc, a: Attr): string | number {
  return a === 'rotation' ? visibleRotation(d) : d[a];
}

export function withAttr(d: ShapeDesc, a: Attr, v: string | number): ShapeDesc {
  return { ...d, [a]: v } as ShapeDesc;
}

export function poolFor(a: Attr, turning = false): (string | number)[] {
  switch (a) {
    case 'kind':
      return turning ? TURN_KINDS : BASIC_KINDS;
    case 'color':
      return [...COLORS];
    case 'size':
      return [...SIZES];
    case 'fill':
      return [...FILLS];
    case 'count':
      return [1, 2, 3, 4];
    case 'rotation':
      return ROTATIONS;
  }
}

export function baseShape(rng: Rng, turning = false): ShapeDesc {
  return {
    kind: rng.pick(turning ? TURN_KINDS : BASIC_KINDS),
    color: rng.pick(COLORS),
    size: 'l',
    fill: 'solid',
    rotation: 0,
    count: 1,
  };
}

/** Pick `n` options (answer + distractors), shuffled, keyed o0..oN. Distractors earlier in the list are preferred. */
function buildOptions(rng: Rng, answer: ShapeDesc, distractors: ShapeDesc[], n: number, preferFirst = 0): ChoiceRound {
  const ak = shapeKey(answer);
  const seen = new Set([ak]);
  const uniq: ShapeDesc[] = [];
  for (const d of distractors) {
    const k = shapeKey(d);
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(d);
    }
  }
  const head = rng.shuffle(uniq.slice(0, preferFirst));
  const tail = rng.shuffle(uniq.slice(preferFirst));
  const picked = [...head, ...tail].slice(0, n - 1);
  const all = rng.shuffle([answer, ...picked]);
  const options = all.map((s, i) => ({ key: `o${i}`, shape: s }));
  const answerKey = options.find((o) => shapeKey(o.shape) === ak)!.key;
  return { options, answerKey };
}

/** Smallest period p (1..n) consistent with the known entries (null = unknown). */
export function minPeriod(keys: (string | null)[]): number {
  const n = keys.length;
  for (let p = 1; p <= n; p++) {
    let ok = true;
    for (let r = 0; r < p && ok; r++) {
      let v: string | null = null;
      for (let i = r; i < n; i += p) {
        const k = keys[i];
        if (k === null) continue;
        if (v === null) v = k;
        else if (v !== k) {
          ok = false;
          break;
        }
      }
    }
    if (ok) return p;
  }
  return n;
}

/* ---------------------------------------------------------------- pattern */

export type PatternUnit = 'AB' | 'ABC' | 'AAB' | 'ABB' | 'AABB' | 'ABCD' | 'grow' | 'turn';

export interface PatternParams {
  unit: PatternUnit | PatternUnit[];
  /** attributes that differ between the unit's letters */
  attrs: Attr[];
  /** shapes in the row including the "?" */
  length: number;
  /** "?" may be anywhere instead of at the end */
  gap?: boolean;
  options?: number;
  rounds?: number;
}

export interface PatternRound extends ChoiceRound {
  seq: ShapeDesc[];
  gapIndex: number;
  /** items to outline when a hint is used */
  unitLen: number;
  unit: PatternUnit;
}

const LETTERS: Record<Exclude<PatternUnit, 'grow' | 'turn'>, number[]> = {
  AB: [0, 1],
  ABC: [0, 1, 2],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  AABB: [0, 0, 1, 1],
  ABCD: [0, 1, 2, 3],
};

/** Distinct letter shapes that differ on every attr in `attrs`. */
function makeLetters(rng: Rng, k: number, attrs: Attr[], turning: boolean): ShapeDesc[] {
  const base = baseShape(rng, turning);
  let usable = attrs.filter((a) => poolFor(a, turning).length >= k);
  if (!usable.length) usable = ['color'];
  const letters = Array.from({ length: k }, () => ({ ...base }));
  for (const a of usable) {
    const vals = rng.sample(poolFor(a, turning), k);
    letters.forEach((l, i) => Object.assign(l, { [a]: vals[i] }));
  }
  return letters;
}

export function genPatternRound(rng: Rng, unit: PatternUnit, attrs: Attr[], length: number, gap: boolean, nOpts: number): PatternRound {
  let seq: ShapeDesc[];
  let gapIndex: number;
  let unitLen: number;
  const distractors: ShapeDesc[] = [];
  let prefer = 0;

  if (unit === 'grow' || unit === 'turn') {
    const turning = unit === 'turn';
    const varying = attrs.filter((a) => a !== (turning ? 'rotation' : 'count'));
    const len = Math.min(length, turning ? 7 : 5);
    const letters = makeLetters(rng, varying.length ? 2 : 1, varying.length ? varying : ['color'], turning);
    const start = turning ? rng.pick(ROTATIONS) : 1;
    const dir = turning ? rng.pick([90, 270]) : 1;
    seq = Array.from({ length: len }, (_, i) => {
      const l = letters[i % letters.length];
      return turning ? { ...l, rotation: (start + dir * i) % 360 } : { ...l, count: start + i };
    });
    gapIndex = gap ? rng.int(2, len - 1) : len - 1;
    unitLen = 2;
    const ans = seq[gapIndex];
    if (turning) {
      for (const r of ROTATIONS) distractors.push({ ...ans, rotation: r });
    } else {
      for (const d of [1, -1, 2]) if (ans.count + d >= 1 && ans.count + d <= 6) distractors.push({ ...ans, count: ans.count + d });
    }
    prefer = distractors.length;
    for (const l of letters) distractors.push(turning ? { ...l, rotation: ans.rotation } : { ...l, count: ans.count });
  } else {
    const pat = LETTERS[unit];
    const k = Math.max(...pat) + 1;
    const turning = attrs.includes('rotation');
    const letters = makeLetters(rng, k, attrs, turning);
    const P = pat.length;
    let len = Math.max(length, 2 * P);
    const build = (n: number) => Array.from({ length: n }, (_, i) => letters[pat[i % P]]);
    const keysWithGap = (s: ShapeDesc[], g: number) => s.map((d, i) => (i === g ? null : shapeKey(d)));
    const fine = (s: ShapeDesc[], g: number) => minPeriod(keysWithGap(s, g)) === P;
    seq = build(len);
    if (gap) {
      const cands = seq.map((_, i) => i).filter((i) => fine(seq, i));
      gapIndex = cands.length ? rng.pick(cands) : len - 1;
    } else {
      while (!fine(seq, len - 1) && len < 4 * P) seq = build(++len);
      gapIndex = len - 1;
    }
    unitLen = P;
    const ans = seq[gapIndex];
    // tempting: the other letters of the unit
    for (const l of letters) distractors.push(l);
    prefer = letters.length;
    // near misses: change one rule attribute or a constant one
    for (const a of attrs) for (const v of poolFor(a, turning)) distractors.push(withAttr(ans, a, v));
    for (const a of ['color', 'kind', 'fill'] as Attr[])
      if (!attrs.includes(a)) distractors.push(withAttr(ans, a, rng.pick(poolFor(a, turning))));
  }
  const ans = seq[gapIndex];
  const { options, answerKey } = buildOptions(rng, ans, distractors, nOpts, prefer);
  return { seq, gapIndex, unitLen, unit, options, answerKey };
}

export function genPatternRounds(rng: Rng, p: PatternParams): PatternRound[] {
  const units = Array.isArray(p.unit) ? p.unit : [p.unit];
  return Array.from({ length: p.rounds ?? 5 }, (_, i) =>
    genPatternRound(rng, units[i % units.length], p.attrs, p.length, !!p.gap, p.options ?? 3),
  );
}

/* ------------------------------------------------------------ odd-one-out */

export type OddAttr = Exclude<Attr, 'rotation'> | 'category';

export interface OddParams {
  count: number;
  /** attributes the odd one may differ on (cycled across rounds) */
  attrs: OddAttr[];
  /** attributes that vary randomly as noise (never singling anyone out) */
  noise?: Exclude<Attr, 'rotation'>[];
  useItems?: boolean;
  rounds?: number;
}

export interface OddRound extends ChoiceRound {
  attr: OddAttr;
}

const MAJOR_CATS = ['fruit', 'animal', 'toy'] as const;
const ODD_CATS = ['fruit', 'animal', 'toy', 'space'] as const;

/** True if exactly one entry differs while all the others are equal. */
export function hasOddSplit(vals: (string | number)[]): boolean {
  const m = new Map<string | number, number>();
  vals.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  if (m.size !== 2) return false;
  const c = [...m.values()].sort((a, b) => a - b);
  return c[0] === 1 && vals.length > 2;
}

function itemRound(rng: Rng, n: number): OddRound {
  const major = rng.pick(MAJOR_CATS);
  const odd = rng.pick(ODD_CATS.filter((c) => c !== major));
  const majors = rng.sample(ITEMS.filter((i) => i.category === major).map((i) => i.name), n - 1);
  const oddItem = rng.pick(ITEMS.filter((i) => i.category === odd).map((i) => i.name));
  const all = rng.shuffle([...majors, oddItem]);
  const options = all.map((name, i) => ({ key: `o${i}`, item: name as ItemName }));
  return { options, answerKey: options.find((o) => o.item === oddItem)!.key, attr: 'category' };
}

export function genOddRound(rng: Rng, n: number, attr: OddAttr, noise: Exclude<Attr, 'rotation'>[]): OddRound {
  if (attr === 'category') return itemRound(rng, n);
  const base = baseShape(rng);
  if (attr === 'count' || noise.includes('count')) base.size = 'l';
  // sizes: only big vs small so the difference is obvious next to other varying attributes
  const pool = attr === 'size' ? ['s', 'l'] : poolFor(attr);
  const [common, oddVal] = rng.sample(pool, 2);
  const shapes = Array.from({ length: n }, () => withAttr(base, attr, common));
  const oddIdx = rng.int(0, n - 1);
  shapes[oddIdx] = withAttr(shapes[oddIdx], attr, oddVal);
  for (const a of noise) {
    if (a === attr) continue;
    const np = poolFor(a);
    let vals: (string | number)[] = [];
    for (let guard = 0; guard < 200; guard++) {
      const palette = rng.sample(np, Math.min(np.length, rng.int(2, 3)));
      vals = Array.from({ length: n }, () => rng.pick(palette));
      if (new Set(vals).size > 1 && !hasOddSplit(vals)) break;
      vals = [];
    }
    if (!vals.length) {
      // fallback: pairs (a a b b c c ...) never single anyone out
      const pv = rng.sample(np, Math.ceil(n / 2));
      vals = rng.shuffle(Array.from({ length: n }, (_, i) => pv[Math.floor(i / 2) % pv.length]));
      if (n % 2 === 1) vals[vals.length - 1] = vals[0];
    }
    vals.forEach((v, i) => (shapes[i] = withAttr(shapes[i], a, v)));
  }
  const options = shapes.map((s, i) => ({ key: `o${i}`, shape: s }));
  return { options, answerKey: `o${oddIdx}`, attr };
}

export function genOddRounds(rng: Rng, p: OddParams): OddRound[] {
  const attrs: OddAttr[] = p.useItems ? ['category'] : p.attrs;
  const order = rng.shuffle(attrs);
  return Array.from({ length: p.rounds ?? 5 }, (_, i) => genOddRound(rng, p.count, order[i % order.length], p.noise ?? []));
}

/* ---------------------------------------------------------- polyominoes */

export function normalizeCells(cells: Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
export function polyKey(cells: Cell[]): string {
  return normalizeCells(cells)
    .map((c) => `${c[0]},${c[1]}`)
    .join(';');
}
export function rotateCells(cells: Cell[], times = 1): Cell[] {
  let out = cells;
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) out = out.map(([x, y]) => [-y, x] as Cell);
  return normalizeCells(out);
}
export function mirrorCells(cells: Cell[]): Cell[] {
  return normalizeCells(cells.map(([x, y]) => [-x, y] as Cell));
}
export function rotationKeys(cells: Cell[]): Set<string> {
  return new Set([0, 1, 2, 3].map((t) => polyKey(rotateCells(cells, t))));
}
export function isChiral(cells: Cell[]): boolean {
  return !rotationKeys(cells).has(polyKey(mirrorCells(cells)));
}

export function randomPoly(rng: Rng, n: number, maxDim = 4): Cell[] {
  for (let guard = 0; guard < 500; guard++) {
    const cells: Cell[] = [[0, 0]];
    const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
    while (cells.length < n) {
      const [x, y] = rng.pick(cells);
      const [dx, dy] = rng.pick([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
      if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
    }
    const norm = normalizeCells(cells);
    const w = Math.max(...norm.map((c) => c[0])) + 1;
    const h = Math.max(...norm.map((c) => c[1])) + 1;
    if (Math.max(w, h) <= maxDim) return norm;
  }
  return normalizeCells([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ]);
}

/* --------------------------------------------------------- shape-rotation */

export interface RotationParams {
  cells: number;
  options: number;
  allowMirrorDistractors: boolean;
  rounds?: number;
}

export interface RotationRound extends ChoiceRound {
  target: ShapeDesc;
}

const polyShape = (cells: Cell[], color: ShapeColor): ShapeDesc => ({
  kind: 'poly',
  color,
  size: 'l',
  fill: 'solid',
  rotation: 0,
  count: 1,
  cells,
});

export function genRotationRound(rng: Rng, p: RotationParams): RotationRound {
  const n = p.cells;
  let target: Cell[] = randomPoly(rng, n);
  for (let guard = 0; guard < 300; guard++) {
    const ok = rotationKeys(target).size >= 2 && (!p.allowMirrorDistractors || isChiral(target));
    if (ok) break;
    target = randomPoly(rng, n);
  }
  const color = rng.pick(COLORS);
  const rots = rotationKeys(target);
  const tKey = polyKey(target);
  const turns = rng.shuffle([1, 2, 3]).filter((t) => polyKey(rotateCells(target, t)) !== tKey);
  const answer = rotateCells(target, turns[0] ?? 1);

  const distract: Cell[][] = [];
  if (p.allowMirrorDistractors) {
    const m = mirrorCells(target);
    for (const t of rng.shuffle([0, 1, 2, 3])) distract.push(rotateCells(m, t));
  }
  const prefer = distract.length;
  for (let guard = 0; guard < 200 && distract.length < prefer + p.options * 2; guard++) {
    const o = randomPoly(rng, n);
    if (rots.has(polyKey(o))) continue;
    distract.push(rotateCells(o, rng.int(0, 3)));
  }
  const filtered = distract.filter((c) => !rots.has(polyKey(c)));
  const res = buildOptions(
    rng,
    polyShape(answer, color),
    filtered.map((c) => polyShape(c, color)),
    p.options,
    prefer,
  );
  return { ...res, target: polyShape(target, color) };
}

export function genRotationRounds(rng: Rng, p: RotationParams): RotationRound[] {
  return Array.from({ length: p.rounds ?? 5 }, () => genRotationRound(rng, p));
}

/* ---------------------------------------------------------- missing-piece */

/** "row:color" = each row one colour; "col:kind"; "latin:fill" = each row/col has all three; "grow:count" = 1,2,3 across. */
export type MatrixRule = string;

export interface MissingParams {
  /** one rule set for all rounds, or several rule sets used in turn */
  rules: MatrixRule[] | MatrixRule[][];
  missing?: 'corner' | 'any';
  options?: number;
  rounds?: number;
}

export interface MissingRound extends ChoiceRound {
  grid: ShapeDesc[];
  missingIndex: number;
  rules: MatrixRule[];
}

export function genMissingRound(rng: Rng, rules: MatrixRule[], missing: 'corner' | 'any', nOpts: number): MissingRound {
  const base = baseShape(rng);
  const parsed = rules.map((r) => {
    const [type, attr] = r.split(':') as [string, Attr];
    const vals =
      type === 'grow' ? (attr === 'size' ? ['s', 'm', 'l'] : [1, 2, 3]) : rng.sample(attr === 'count' ? [1, 2, 3, 4] : poolFor(attr), 3);
    return { type, attr, vals, dir: rng.pick([1, 2]), shift: rng.int(0, 2) };
  });
  const grid: ShapeDesc[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      let d = { ...base };
      for (const ru of parsed) {
        const idx =
          ru.type === 'row' ? r : ru.type === 'col' || ru.type === 'grow' ? c : (r * ru.dir + c + ru.shift) % 3;
        d = withAttr(d, ru.attr, ru.vals[idx]);
      }
      grid.push(d);
    }
  const missingIndex = missing === 'corner' ? 8 : rng.int(0, 8);
  const ans = grid[missingIndex];
  const distractors: ShapeDesc[] = [];
  for (const ru of parsed) for (const v of ru.vals) distractors.push(withAttr(ans, ru.attr, v));
  if (parsed.length > 1)
    for (const v0 of parsed[0].vals) for (const v1 of parsed[1].vals) distractors.push(withAttr(withAttr(ans, parsed[0].attr, v0), parsed[1].attr, v1));
  const prefer = distractors.length;
  for (const a of ['kind', 'color', 'fill'] as Attr[])
    if (!parsed.some((p) => p.attr === a)) distractors.push(withAttr(ans, a, rng.pick(poolFor(a))));
  const res = buildOptions(rng, ans, distractors, nOpts, prefer);
  return { ...res, grid, missingIndex, rules };
}

export function genMissingRounds(rng: Rng, p: MissingParams): MissingRound[] {
  const sets: MatrixRule[][] = Array.isArray(p.rules[0]) ? (p.rules as MatrixRule[][]) : [p.rules as MatrixRule[]];
  return Array.from({ length: p.rounds ?? 4 }, (_, i) => genMissingRound(rng, sets[i % sets.length], p.missing ?? 'corner', p.options ?? 4));
}
