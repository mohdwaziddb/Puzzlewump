/**
 * Memory Kingdom — pure puzzle generation + validation (no React).
 * All randomness comes from the Rng passed in (createRng(seed)), so the same seed
 * always builds the same puzzle.
 */
import type { Rng } from '@/engine/rng';
import type { ItemName } from '@/art/items';
import { isPrefix, sameSequence } from '@/engine/ValidationEngine';

/** Easy-to-tell-apart items that fit the castle & fantasy garden theme. */
export const MEMORY_ITEMS = [
  'crown', 'key', 'gem', 'bell', 'star', 'moon', 'sun', 'flower',
  'mushroom', 'tree', 'leaf', 'butterfly', 'owl', 'frog', 'rabbit', 'cat',
  'dog', 'lion', 'panda', 'turtle', 'fish', 'apple', 'banana', 'grapes',
  'watermelon', 'orange', 'pear', 'ball', 'kite', 'balloon', 'drum', 'book',
  'umbrella', 'hat', 'cloud', 'shell', 'rocket', 'planet', 'elephant', 'monkey',
] as const satisfies readonly ItemName[];

const clampInt = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : def;
  return Math.max(min, Math.min(max, n));
};

/* ================================================================ memory-match */

export interface MatchParams {
  pairs?: number;
  cols?: number;
  /** show every card face-up for this long at the start (beginner help) */
  peekMs?: number;
}
export interface MatchPuzzle {
  cards: ItemName[];
  cols: number;
  rows: number;
  peekMs: number;
}

export function generateMatch(p: MatchParams, rng: Rng): MatchPuzzle {
  const pairs = clampInt(p.pairs, 2, 15, 3);
  const cols = clampInt(p.cols, 2, 6, pairs <= 3 ? 3 : 4);
  const items = rng.sample(MEMORY_ITEMS, pairs);
  const cards = rng.shuffle([...items, ...items]);
  return { cards, cols, rows: Math.ceil(cards.length / cols), peekMs: clampInt(p.peekMs, 0, 5000, 0) };
}

export function isPair(cards: readonly ItemName[], a: number, b: number): boolean {
  return a !== b && a >= 0 && b >= 0 && a < cards.length && b < cards.length && cards[a] === cards[b];
}

export function partnerOf(cards: readonly ItemName[], i: number): number {
  return cards.findIndex((c, j) => j !== i && c === cards[i]);
}

/**
 * Gentle mistake rule: a mismatch only counts as a mistake when the child could have
 * known better — the second card was seen before, or the first card's partner was seen.
 */
export function isCarelessMismatch(
  cards: readonly ItemName[],
  seen: ReadonlySet<number>,
  first: number,
  second: number,
): boolean {
  if (isPair(cards, first, second)) return false;
  return seen.has(second) || seen.has(partnerOf(cards, first));
}

/* ============================================================= sequence-memory */

export interface SequenceParams {
  pads?: number;
  startLength?: number;
  rounds?: number;
  /** how long each pad stays lit while the sequence plays */
  stepMs?: number;
}
export interface SequencePuzzle {
  pads: number;
  /** full sequence; round r uses the first startLength + r steps */
  sequence: number[];
  startLength: number;
  rounds: number;
  stepMs: number;
}

export function generateSequence(p: SequenceParams, rng: Rng): SequencePuzzle {
  const pads = clampInt(p.pads, 3, 6, 4);
  const startLength = clampInt(p.startLength, 1, 8, 2);
  const rounds = clampInt(p.rounds, 1, 8, 3);
  const total = startLength + rounds - 1;
  const sequence: number[] = [];
  while (sequence.length < total) {
    const n = rng.int(0, pads - 1);
    const len = sequence.length;
    // never the same pad 3 times in a row, and no immediate repeat in the first 2 steps
    if (len >= 2 && sequence[len - 1] === n && sequence[len - 2] === n) continue;
    if (len === 1 && sequence[0] === n) continue;
    sequence.push(n);
  }
  return { pads, sequence, startLength, rounds, stepMs: clampInt(p.stepMs, 250, 1500, 650) };
}

export function sequenceForRound(pz: SequencePuzzle, round: number): number[] {
  return pz.sequence.slice(0, pz.startLength + round);
}

export type StepResult = 'ok' | 'wrong' | 'done';
/** Check the child's input so far against the round's target sequence. */
export function checkSequenceInput(target: readonly number[], input: readonly number[]): StepResult {
  if (!isPrefix(input, target)) return 'wrong';
  return sameSequence(input, target) ? 'done' : 'ok';
}

/* =============================================================== object-memory */

export interface ObjectParams {
  mode?: 'pick' | 'missing';
  count?: number;
  showMs?: number;
  /** pick: size of the answer pool (shown + distractors) */
  pool?: number;
  /** missing: number of questions */
  rounds?: number;
  /** missing: shuffle the remaining items so position does not give it away */
  shuffle?: boolean;
}
export interface PickRound {
  shown: ItemName[];
  /** shown + distractors, shuffled */
  pool: ItemName[];
}
export interface MissingRound {
  shown: ItemName[];
  /** what is displayed afterwards: shown minus the missing one (null = empty slot) */
  after: (ItemName | null)[];
  missing: ItemName;
  /** multiple-choice answers (contains `missing` exactly once) */
  choices: ItemName[];
}
export type ObjectPuzzle =
  | { mode: 'pick'; showMs: number; rounds: PickRound[] }
  | { mode: 'missing'; showMs: number; rounds: MissingRound[] };

export function generateObject(p: ObjectParams, rng: Rng): ObjectPuzzle {
  const mode = p.mode === 'missing' ? 'missing' : 'pick';
  const count = clampInt(p.count, 2, 9, 3);
  const showMs = clampInt(p.showMs, 1000, 10000, 4000);
  if (mode === 'pick') {
    const poolSize = clampInt(p.pool, count + 1, 16, count * 2);
    const all = rng.sample(MEMORY_ITEMS, poolSize);
    const shown = all.slice(0, count);
    return { mode, showMs, rounds: [{ shown, pool: rng.shuffle(all) }] };
  }
  const roundsN = clampInt(p.rounds, 1, 5, 1);
  const rounds: MissingRound[] = [];
  let lastMissing: ItemName | null = null;
  for (let r = 0; r < roundsN; r++) {
    const set = rng.sample(MEMORY_ITEMS, count + 3);
    const shown = set.slice(0, count);
    let mi = rng.int(0, count - 1);
    if (shown[mi] === lastMissing) mi = (mi + 1) % count;
    const missing = shown[mi];
    lastMissing = missing;
    const rest = shown.filter((_, i) => i !== mi);
    const after: (ItemName | null)[] = p.shuffle ? rng.shuffle(rest) : shown.map((s, i) => (i === mi ? null : s));
    const choices = rng.shuffle([missing, ...set.slice(count, count + 3)]);
    rounds.push({ shown, after, missing, choices });
  }
  return { mode, showMs, rounds };
}

export function isShownItem(round: PickRound, item: ItemName): boolean {
  return round.shown.includes(item);
}

/* ============================================================= position-memory */

export interface PositionParams {
  rows?: number;
  cols?: number;
  count?: number;
  showMs?: number;
  /** all: tap every cell that had an item. which: "Where was the cat?" questions */
  mode?: 'all' | 'which';
  /** which: number of questions (default = count, max = count) */
  asks?: number;
}
export interface PositionPuzzle {
  rows: number;
  cols: number;
  showMs: number;
  mode: 'all' | 'which';
  /** cell index -> item placed there */
  placed: { cell: number; item: ItemName }[];
  /** which-mode: the order items are asked about (indices into placed) */
  asks: number[];
}

export function generatePosition(p: PositionParams, rng: Rng): PositionPuzzle {
  const rows = clampInt(p.rows, 2, 6, 3);
  const cols = clampInt(p.cols, 2, 6, 3);
  const count = clampInt(p.count, 1, Math.floor((rows * cols) / 2), 3);
  const showMs = clampInt(p.showMs, 1000, 10000, 3000);
  const mode = p.mode === 'which' ? 'which' : 'all';
  const cells = rng.sample(
    Array.from({ length: rows * cols }, (_, i) => i),
    count,
  );
  // "all" mode uses one friendly item everywhere-ish (variety but small set); "which" needs distinct items
  const items = rng.sample(MEMORY_ITEMS, count);
  const placed = cells.map((cell, i) => ({ cell, item: items[i] }));
  const asksN = mode === 'which' ? clampInt(p.asks, 1, count, count) : 0;
  const asks = rng.sample(
    placed.map((_, i) => i),
    asksN,
  );
  return { rows, cols, showMs, mode, placed, asks };
}

export function itemAt(pz: PositionPuzzle, cell: number): ItemName | null {
  return pz.placed.find((x) => x.cell === cell)?.item ?? null;
}

/** all-mode: is this a cell that had an item? */
export function isItemCell(pz: PositionPuzzle, cell: number): boolean {
  return pz.placed.some((x) => x.cell === cell);
}

/** which-mode: is this the cell of the asked item? */
export function isAskedCell(pz: PositionPuzzle, askIndex: number, cell: number): boolean {
  const a = pz.asks[askIndex];
  return a !== undefined && pz.placed[a].cell === cell;
}

/* =============================================================== number-memory */

export interface NumberParams {
  digits?: number;
  showMs?: number;
  rounds?: number;
}
export interface NumberPuzzle {
  digits: number;
  showMs: number;
  numbers: string[];
}

export function generateNumber(p: NumberParams, rng: Rng): NumberPuzzle {
  const digits = clampInt(p.digits, 1, 8, 3);
  const showMs = clampInt(p.showMs, 1000, 10000, 2500);
  const roundsN = clampInt(p.rounds, 1, 6, 3);
  const numbers: string[] = [];
  let guard = 0;
  while (numbers.length < roundsN && guard++ < 1000) {
    let s = String(rng.int(1, 9));
    while (s.length < digits) {
      const d = rng.int(0, 9);
      // no digit three times in a row, keeps numbers "interesting"
      if (s.length >= 2 && s[s.length - 1] === String(d) && s[s.length - 2] === String(d)) continue;
      s += d;
    }
    if (digits > 1 && new Set(s).size === 1) continue;
    if (numbers.includes(s)) continue;
    numbers.push(s);
  }
  return { digits, showMs, numbers };
}

export function checkNumber(target: string, typed: string): boolean {
  return typed.trim() === target;
}

/* ===================================================================== dispatch */

export type MemoryPuzzle =
  | { type: 'memory-match'; puzzle: MatchPuzzle }
  | { type: 'sequence-memory'; puzzle: SequencePuzzle }
  | { type: 'object-memory'; puzzle: ObjectPuzzle }
  | { type: 'position-memory'; puzzle: PositionPuzzle }
  | { type: 'number-memory'; puzzle: NumberPuzzle };

/** Build any Memory Kingdom puzzle from a stage (used by tests / previews). */
export function generateMemoryStage(gameType: string, params: Record<string, unknown>, rng: Rng): MemoryPuzzle | null {
  switch (gameType) {
    case 'memory-match':
      return { type: gameType, puzzle: generateMatch(params as MatchParams, rng) };
    case 'sequence-memory':
      return { type: gameType, puzzle: generateSequence(params as SequenceParams, rng) };
    case 'object-memory':
      return { type: gameType, puzzle: generateObject(params as ObjectParams, rng) };
    case 'position-memory':
      return { type: gameType, puzzle: generatePosition(params as PositionParams, rng) };
    case 'number-memory':
      return { type: gameType, puzzle: generateNumber(params as NumberParams, rng) };
    default:
      return null;
  }
}
