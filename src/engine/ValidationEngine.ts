/** Small, shared answer-checking helpers used by game modules and tests. */

export function sameSequence<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function isPrefix<T>(prefix: readonly T[], full: readonly T[]): boolean {
  return prefix.length <= full.length && prefix.every((v, i) => v === full[i]);
}

export function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(b);
  return a.every((v) => s.has(v));
}

/** Multiple-choice options must contain the answer exactly once and no duplicates. */
export function validChoices<T>(choices: readonly T[], answer: T): boolean {
  return new Set(choices).size === choices.length && choices.filter((c) => c === answer).length === 1;
}

/** Build unique numeric distractors around the answer (never negative unless allowNegative). */
export function numericChoices(
  answer: number,
  count: number,
  rand: () => number,
  spread = 5,
  allowNegative = false,
): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard++ < 500) {
    const delta = Math.floor(rand() * spread * 2 + 1) - spread;
    const v = answer + (delta === 0 ? spread + 1 : delta);
    if (!allowNegative && v < 0) continue;
    set.add(v);
  }
  let k = 1;
  while (set.size < count) set.add(answer + spread + k++);
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
