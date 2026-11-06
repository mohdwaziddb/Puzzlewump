/**
 * Number Planet — pure puzzle generation + validation (no React).
 * Every generator takes an Rng from createRng(seed) so content is deterministic.
 */
import { createRng, type Rng } from '@/engine/rng';
import { numericChoices } from '@/engine/ValidationEngine';
import type { GameType } from '@/types';

/* ------------------------------------------------------------------ basics */

export type Op = '+' | '-' | 'x' | '/';
export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '-', x: '×', '/': '÷' };

/** Objects used for beginner counting visuals (names from src/art/items). */
export const VISUAL_ITEMS = ['apple', 'star', 'rocket', 'planet', 'ufo', 'strawberry', 'balloon', 'comet', 'cherry', 'ball', 'fish', 'moon'] as const;
export type VisualItem = (typeof VISUAL_ITEMS)[number];

export function applyOp(a: number, op: Op, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case 'x':
      return a * b;
    case '/':
      return a / b;
  }
}

/** a op b = c */
export interface Eq {
  a: number;
  op: Op;
  b: number;
  c: number;
}

export function eqText(e: Eq): string {
  return `${e.a} ${OP_SYMBOL[e.op]} ${e.b}`;
}

/** Every question has a printable prompt, the answer and the multiple-choice options. */
export interface BaseQ {
  prompt: string;
  answer: number | string;
  choices: (number | string)[];
}

/** The validator used by every mechanic. */
export function isCorrect(q: BaseQ, value: number | string): boolean {
  return value === q.answer;
}

function spreadFor(answer: number): number {
  return Math.max(3, Math.round(Math.abs(answer) * 0.2));
}

export function makeChoices(rng: Rng, answer: number, count = 4): number[] {
  return numericChoices(answer, count, rng.next, spreadFor(answer));
}

/** Build `rounds` questions, retrying a few times to avoid duplicates inside one stage. */
function uniqueRounds<T extends BaseQ>(rounds: number, make: () => T): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = 0; i < rounds; i++) {
    let q = make();
    for (let t = 0; t < 40 && seen.has(q.prompt); t++) q = make();
    seen.add(q.prompt);
    out.push(q);
  }
  return out;
}

/** Random equation with a non-negative integer result. `max` bounds +/-, `table` bounds ×/÷ factors. */
export function makeEq(rng: Rng, op: Op, max: number, table: number, tableMin = 2): Eq {
  const m = Math.max(3, max);
  const t = Math.max(2, table);
  const lo = Math.max(2, Math.min(tableMin, t));
  switch (op) {
    case '+': {
      const c = rng.int(Math.max(2, Math.floor(m * 0.3)), m);
      const a = rng.int(1, c - 1);
      return { a, op, b: c - a, c };
    }
    case '-': {
      const a = rng.int(Math.max(2, Math.floor(m * 0.3)), m);
      const b = rng.int(1, a - 1);
      return { a, op, b, c: a - b };
    }
    case 'x': {
      const a = rng.int(lo, t);
      const b = rng.int(lo, t);
      return { a, op, b, c: a * b };
    }
    case '/': {
      const b = rng.int(lo, t);
      const q = rng.int(lo, t);
      return { a: b * q, op, b, c: q };
    }
  }
}

/** A friendly expression whose value is exactly v (used by compare). */
export function exprFor(rng: Rng, v: number, ops: Op[]): { label: string; value: number } {
  const op = rng.pick(ops);
  if (op === 'x') {
    const pairs: [number, number][] = [];
    for (let a = 2; a * a <= v; a++) if (v % a === 0) pairs.push([a, v / a]);
    if (pairs.length) {
      const [a, b] = rng.pick(pairs);
      return rng.chance(0.5) ? { label: `${a} × ${b}`, value: v } : { label: `${b} × ${a}`, value: v };
    }
  }
  if (op === '-' || v < 2) {
    const b = rng.int(1, Math.max(2, Math.min(9, v + 3)));
    return { label: `${v + b} - ${b}`, value: v };
  }
  const a = rng.int(1, v - 1);
  return { label: `${a} + ${v - a}`, value: v };
}

/* ------------------------------------------------------- math-challenge */

export interface ArithParams {
  ops?: Op[];
  max?: number;
  table?: number;
  /** smallest ×/÷ factor (default 2) */
  tableMin?: number;
  rounds?: number;
  input?: 'choice' | 'pad';
  visual?: boolean;
}

export interface ArithQ extends BaseQ {
  kind: 'arith';
  eq: Eq;
  answer: number;
  choices: number[];
  /** counting picture for small +/- */
  visual?: { item: VisualItem };
}

export function genArith(rng: Rng, p: ArithParams): ArithQ[] {
  const ops = p.ops?.length ? p.ops : (['+'] as Op[]);
  const max = p.max ?? 10;
  const table = p.table ?? 10;
  return uniqueRounds(p.rounds ?? 6, () => {
    const eq = makeEq(rng, rng.pick(ops), max, table, p.tableMin);
    const visual = p.visual && (eq.op === '+' || eq.op === '-') && Math.max(eq.a, eq.b, eq.c) <= 10;
    return {
      kind: 'arith',
      eq,
      prompt: `${eqText(eq)} = ?`,
      answer: eq.c,
      choices: makeChoices(rng, eq.c),
      visual: visual ? { item: rng.pick(VISUAL_ITEMS) } : undefined,
    };
  });
}

/* ------------------------------------------------------- missing-number */

export interface MissingParams {
  ops?: Op[];
  max?: number;
  table?: number;
  rounds?: number;
}

export interface MissingQ extends BaseQ {
  kind: 'missing';
  eq: Eq;
  /** 0 = a, 1 = b, 2 = c is hidden */
  hide: 0 | 1 | 2;
  /** ["3", "+", "?", "=", "7"] */
  parts: string[];
  /** expression that computes the missing number (shown as a hint), e.g. "7 - 3" */
  helper: Eq;
  answer: number;
  choices: number[];
}

/** The inverse operation that solves for the hidden slot. */
export function helperFor(e: Eq, hide: 0 | 1 | 2): Eq {
  if (hide === 2) return e;
  const known = hide === 0 ? e.b : e.a;
  const hidden = hide === 0 ? e.a : e.b;
  switch (e.op) {
    case '+':
      return { a: e.c, op: '-', b: known, c: hidden };
    case 'x':
      return { a: e.c, op: '/', b: known, c: hidden };
    case '-':
      return hide === 0 ? { a: e.c, op: '+', b: e.b, c: hidden } : { a: e.a, op: '-', b: e.c, c: hidden };
    case '/':
      return hide === 0 ? { a: e.c, op: 'x', b: e.b, c: hidden } : { a: e.a, op: '/', b: e.c, c: hidden };
  }
}

export function genMissing(rng: Rng, p: MissingParams): MissingQ[] {
  const ops = p.ops?.length ? p.ops : (['+'] as Op[]);
  const max = p.max ?? 10;
  const table = p.table ?? 10;
  return uniqueRounds(p.rounds ?? 6, () => {
    const eq = makeEq(rng, rng.pick(ops), max, table);
    // hiding the result is plain arithmetic, so prefer hiding an operand
    const hide = rng.pick([0, 1, 1, 0, 2] as const);
    const vals = [eq.a, eq.b, eq.c];
    const answer = vals[hide];
    const parts = [String(eq.a), OP_SYMBOL[eq.op], String(eq.b), '=', String(eq.c)];
    parts[hide === 2 ? 4 : hide * 2] = '?';
    return {
      kind: 'missing',
      eq,
      hide,
      parts,
      helper: helperFor(eq, hide),
      prompt: parts.join(' '),
      answer,
      choices: makeChoices(rng, answer),
    };
  });
}

/* ------------------------------------------------------- number-sequence */

export type SeqKind = 'up' | 'down' | 'skip' | 'double' | 'growth' | 'alternate';

export interface SeqParams {
  kinds?: SeqKind[];
  /** how many terms are shown before the "?" (min 4) */
  length?: number;
  max?: number;
  /** biggest step for up/down */
  stepMax?: number;
  rounds?: number;
}

export interface SeqQ extends BaseQ {
  kind: 'seq';
  seqKind: SeqKind;
  terms: number[];
  /** step label between consecutive terms incl. the last one ("+2", "×2") */
  gaps: string[];
  answer: number;
  choices: number[];
}

function seqTerms(rng: Rng, kind: SeqKind, n: number, max: number, stepMax: number): number[] | null {
  // n = total terms incl. answer
  switch (kind) {
    case 'up':
    case 'down': {
      const sMax = Math.min(stepMax, Math.floor(max / (n - 1)));
      if (sMax < 1) return null;
      const step = rng.int(1, sMax);
      const start = rng.int(0, max - step * (n - 1));
      const t = Array.from({ length: n }, (_, i) => start + step * i);
      return kind === 'up' ? t : t.reverse();
    }
    case 'skip': {
      const steps = [2, 3, 4, 5, 10].filter((s) => Math.floor(max / s) >= n - 1);
      if (!steps.length) return null;
      const step = rng.pick(steps);
      const k = rng.int(0, Math.floor(max / step) - (n - 1));
      return Array.from({ length: n }, (_, i) => (k + i) * step);
    }
    case 'double': {
      const hi = Math.floor(max / 2 ** (n - 1));
      if (hi < 1) return null;
      const start = rng.int(1, Math.min(hi, 6));
      return Array.from({ length: n }, (_, i) => start * 2 ** i);
    }
    case 'growth': {
      const d0 = rng.int(1, 3);
      let total = 0;
      for (let i = 0; i < n - 1; i++) total += d0 + i;
      if (total > max) return null;
      let v = rng.int(0, Math.min(10, max - total));
      const t = [v];
      for (let i = 0; i < n - 1; i++) t.push((v += d0 + i));
      return t;
    }
    case 'alternate': {
      const a = rng.int(2, 5);
      const b = rng.int(1, a - 1);
      const deltas = Array.from({ length: n - 1 }, (_, i) => (i % 2 === 0 ? a : -b));
      let top = 0;
      let run = 0;
      for (const d of deltas) top = Math.max(top, (run += d));
      if (top > max) return null;
      let v = rng.int(0, Math.min(15, max - top));
      const t = [v];
      for (const d of deltas) t.push((v += d));
      return t;
    }
  }
}

function gapLabel(kind: SeqKind, a: number, b: number): string {
  if (kind === 'double') return '×2';
  return b >= a ? `+${b - a}` : `-${a - b}`;
}

export function genSequence(rng: Rng, p: SeqParams): SeqQ[] {
  const kinds = p.kinds?.length ? p.kinds : (['up'] as SeqKind[]);
  const len = Math.max(4, p.length ?? 4);
  const max = p.max ?? 20;
  const stepMax = p.stepMax ?? 10;
  return uniqueRounds(p.rounds ?? 6, () => {
    let kind = rng.pick(kinds);
    let t: number[] | null = null;
    for (let i = 0; i < 20 && !t; i++) t = seqTerms(rng, kind, len + 1, max, stepMax);
    if (!t) {
      kind = 'up';
      t = Array.from({ length: len + 1 }, (_, i) => i + 1);
    }
    const terms = t.slice(0, len);
    const answer = t[len];
    return {
      kind: 'seq',
      seqKind: kind,
      terms,
      gaps: t.slice(1).map((v, i) => gapLabel(kind, t![i], v)),
      prompt: `${terms.join(', ')}, ?`,
      answer,
      choices: makeChoices(rng, answer),
    };
  });
}

/* ------------------------------------------------------- compare-numbers */

export type Sign = '<' | '=' | '>';
export const SIGNS: Sign[] = ['<', '=', '>'];

export interface CompareParams {
  max?: number;
  /** sides may be expressions like "3 + 4" */
  expressions?: boolean;
  /** ops used inside expressions */
  ops?: Op[];
  /** 'sign' = pick > < =, 'pick' = tap biggest/smallest, 'mix' = both */
  mode?: 'sign' | 'pick' | 'mix';
  /** options in pick mode (3-4) */
  options?: number;
  /** counting pictures instead of digits (small numbers only) */
  visual?: boolean;
  rounds?: number;
}

export interface Side {
  value: number;
  label: string;
}

export interface CompareSignQ extends BaseQ {
  kind: 'compare-sign';
  left: Side;
  right: Side;
  answer: Sign;
  choices: Sign[];
  visual?: { item: VisualItem };
}

export interface ComparePickQ extends BaseQ {
  kind: 'compare-pick';
  target: 'biggest' | 'smallest';
  options: Side[];
  /** the target value (option values are all distinct) */
  answer: number;
  choices: number[];
  visual?: { item: VisualItem };
}

export type CompareQ = CompareSignQ | ComparePickQ;

export function signOf(a: number, b: number): Sign {
  return a < b ? '<' : a > b ? '>' : '=';
}

function genCompareSign(rng: Rng, p: CompareParams): CompareSignQ {
  const visual = !!p.visual;
  const max = visual ? Math.min(10, p.max ?? 10) : (p.max ?? 20);
  const ops = p.ops?.length ? p.ops : (['+', '-'] as Op[]);
  const lo = visual ? 1 : 0;
  const side = (v: number, allowExpr: boolean): Side =>
    p.expressions && allowExpr && v >= 2 ? exprFor(rng, v, ops) : { value: v, label: String(v) };
  const lv = rng.int(Math.max(lo, 2), max);
  const left = side(lv, true);
  let right: Side;
  if (rng.chance(0.25)) {
    right = side(lv, rng.chance(0.5));
  } else {
    const spread = Math.max(2, Math.round(max * 0.3));
    let rv = lv;
    while (rv === lv) rv = Math.min(max, Math.max(lo, lv + rng.int(-spread, spread)));
    right = side(rv, rng.chance(0.4));
  }
  // keep the expression on a random side
  const swap = rng.chance(0.5);
  const L = swap ? right : left;
  const R = swap ? left : right;
  return {
    kind: 'compare-sign',
    left: L,
    right: R,
    prompt: `${L.label} ? ${R.label}`,
    answer: signOf(L.value, R.value),
    choices: SIGNS.slice(),
    visual: visual ? { item: rng.pick(VISUAL_ITEMS) } : undefined,
  };
}

function genComparePick(rng: Rng, p: CompareParams): ComparePickQ {
  const visual = !!p.visual;
  const max = visual ? Math.min(10, p.max ?? 10) : (p.max ?? 20);
  const ops = p.ops?.length ? p.ops : (['+', '-'] as Op[]);
  const n = Math.max(2, Math.min(4, p.options ?? 3));
  const pool = Array.from({ length: max }, (_, i) => i + 1); // 1..max
  const values = rng.sample(pool, n);
  const options = values.map((v) =>
    p.expressions && v >= 2 && rng.chance(0.65) ? exprFor(rng, v, ops) : { value: v, label: String(v) },
  );
  const target = rng.chance(0.5) ? 'biggest' : 'smallest';
  const answer = target === 'biggest' ? Math.max(...values) : Math.min(...values);
  return {
    kind: 'compare-pick',
    target,
    options,
    prompt: `${target}: ${options.map((o) => o.label).join(' | ')}`,
    answer,
    choices: values,
    visual: visual ? { item: rng.pick(VISUAL_ITEMS) } : undefined,
  };
}

export function genCompare(rng: Rng, p: CompareParams): CompareQ[] {
  const mode = p.mode ?? 'sign';
  return uniqueRounds<CompareQ>(p.rounds ?? 6, () => {
    const pick = mode === 'pick' || (mode === 'mix' && rng.chance(0.5));
    return pick ? genComparePick(rng, p) : genCompareSign(rng, p);
  });
}

/* ------------------------------------------------------- mental-chain */

export interface ChainParams {
  steps?: number;
  max?: number;
  ops?: Op[];
  rounds?: number;
  input?: 'choice' | 'pad';
}

export interface ChainStep {
  op: Op;
  n: number;
}

export interface ChainQ extends BaseQ {
  kind: 'chain';
  start: number;
  steps: ChainStep[];
  /** running value after each step (last = answer) */
  values: number[];
  answer: number;
  choices: number[];
}

export function stepLabel(s: ChainStep): string {
  return `${OP_SYMBOL[s.op]}${s.n}`;
}

function chainStep(rng: Rng, cur: number, ops: Op[], max: number, prev?: ChainStep): ChainStep | null {
  const small = Math.max(2, Math.min(9, Math.floor(max / 4)));
  const options: ChainStep[] = [];
  for (const op of ops) {
    if (op === '+' && cur < max) options.push({ op, n: rng.int(1, Math.min(small, max - cur)) });
    if (op === '-' && cur >= 2) options.push({ op, n: rng.int(1, Math.min(small, cur - 1)) });
    if (op === 'x' && cur >= 2 && cur * 2 <= max) options.push({ op, n: rng.int(2, Math.min(5, Math.floor(max / cur))) });
    if (op === '/' && cur >= 4) {
      const ds = [2, 3, 4, 5].filter((d) => cur % d === 0 && cur / d >= 1);
      if (ds.length) options.push({ op, n: rng.pick(ds) });
    }
  }
  // don't undo the previous step (+3 then -3)
  const undo = (s: ChainStep) =>
    !!prev && s.n === prev.n && ((s.op === '+' && prev.op === '-') || (s.op === '-' && prev.op === '+') || (s.op === 'x' && prev.op === '/') || (s.op === '/' && prev.op === 'x'));
  const ok = options.filter((s) => !undo(s));
  return ok.length ? rng.pick(ok) : options.length ? rng.pick(options) : null;
}

export function genChain(rng: Rng, p: ChainParams): ChainQ[] {
  const ops = p.ops?.length ? p.ops : (['+', '-'] as Op[]);
  const max = p.max ?? 20;
  const count = Math.max(1, p.steps ?? 2);
  return uniqueRounds(p.rounds ?? 5, () => {
    const start = rng.int(2, Math.max(3, Math.min(12, Math.floor(max / 2))));
    const steps: ChainStep[] = [];
    const values: number[] = [];
    let cur = start;
    for (let i = 0; i < count; i++) {
      const s = chainStep(rng, cur, ops, max, steps[i - 1]) ?? { op: '+', n: 1 };
      cur = applyOp(cur, s.op, s.n);
      steps.push(s);
      values.push(cur);
    }
    return {
      kind: 'chain',
      start,
      steps,
      values,
      prompt: `${start} ${steps.map(stepLabel).join(' ')} = ?`,
      answer: cur,
      choices: makeChoices(rng, cur),
    };
  });
}

/* ------------------------------------------------------- dispatcher */

export type MathQuestion = ArithQ | MissingQ | SeqQ | CompareQ | ChainQ;

/** Generate a whole stage exactly like the component does (used by tests). */
export function generateStage(gameType: GameType, params: Record<string, unknown>, seed: number): MathQuestion[] {
  const rng = createRng(seed);
  switch (gameType) {
    case 'math-challenge':
      return genArith(rng, params as ArithParams);
    case 'missing-number':
      return genMissing(rng, params as MissingParams);
    case 'number-sequence':
      return genSequence(rng, params as SeqParams);
    case 'compare-numbers':
      return genCompare(rng, params as CompareParams);
    case 'mental-chain':
      return genChain(rng, params as ChainParams);
    default:
      throw new Error(`not a math game: ${gameType}`);
  }
}
