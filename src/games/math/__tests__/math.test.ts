import { world2Levels } from '@/data/levels/world2';
import { validChoices } from '@/engine/ValidationEngine';
import { createRng } from '@/engine/rng';
import type { LevelConfig } from '@/types';
import {
  applyOp,
  generateStage,
  genArith,
  genChain,
  genSequence,
  isCorrect,
  signOf,
  type ArithQ,
  type ChainQ,
  type CompareQ,
  type Eq,
  type MathQuestion,
  type MissingQ,
  type SeqQ,
} from '../generators';

const isNatInt = (n: number) => Number.isInteger(n) && n >= 0;

function checkEq(e: Eq) {
  expect(isNatInt(e.a) && isNatInt(e.b) && isNatInt(e.c)).toBe(true);
  if (e.op === '/') {
    expect(e.b).toBeGreaterThan(0);
    expect(e.a % e.b).toBe(0);
  }
  expect(applyOp(e.a, e.op, e.b)).toBe(e.c);
}

/** Independent solver: every simple rule that fits the shown terms must predict the same next term. */
function predictNext(t: number[]): number[] {
  const d = t.slice(1).map((v, i) => v - t[i]);
  const preds: number[] = [];
  if (d.every((x) => x === d[0])) preds.push(t[t.length - 1] + d[0]);
  if (t[0] !== 0 && t.every((v, i) => i === 0 || v === t[i - 1] * (t[1] / t[0]))) preds.push(t[t.length - 1] * (t[1] / t[0]));
  const dd = d.slice(1).map((v, i) => v - d[i]);
  if (dd.every((x) => x === dd[0])) preds.push(t[t.length - 1] + d[d.length - 1] + dd[0]);
  if (d.length >= 3 && d.every((x, i) => x === d[i % 2])) preds.push(t[t.length - 1] + d[d.length % 2]);
  return preds;
}

function checkQuestion(q: MathQuestion) {
  // choices contain the answer exactly once, no duplicates
  expect(validChoices(q.choices as (number | string)[], q.answer)).toBe(true);
  // validator accepts the answer and rejects every other choice
  expect(isCorrect(q, q.answer)).toBe(true);
  for (const c of q.choices) if (c !== q.answer) expect(isCorrect(q, c)).toBe(false);
  if (typeof q.answer === 'number') expect(isCorrect(q, q.answer + 1)).toBe(false);
  if (q.kind !== 'compare-sign') for (const c of q.choices) expect(isNatInt(c as number)).toBe(true);

  switch (q.kind) {
    case 'arith': {
      checkEq(q.eq);
      expect(q.answer).toBe(q.eq.c);
      break;
    }
    case 'missing': {
      const m = q as MissingQ;
      checkEq(m.eq);
      checkEq(m.helper);
      expect(m.helper.c).toBe(m.answer);
      expect([m.eq.a, m.eq.b, m.eq.c][m.hide]).toBe(m.answer);
      expect(m.parts.filter((p) => p === '?')).toHaveLength(1);
      // the gap has exactly one solution among non-negative integers
      let sols = 0;
      for (let v = 0; v <= 2000; v++) {
        const vals = [m.eq.a, m.eq.b, m.eq.c];
        vals[m.hide] = v;
        if (m.eq.op === '/' && vals[1] === 0) continue;
        if (applyOp(vals[0], m.eq.op, vals[1]) === vals[2]) sols++;
      }
      expect(sols).toBe(1);
      break;
    }
    case 'seq': {
      const s = q as SeqQ;
      expect(s.terms.length).toBeGreaterThanOrEqual(4);
      s.terms.forEach((t) => expect(isNatInt(t)).toBe(true));
      expect(isNatInt(s.answer)).toBe(true);
      const preds = predictNext(s.terms);
      expect(preds.length).toBeGreaterThan(0);
      preds.forEach((p) => expect(p).toBe(s.answer));
      break;
    }
    case 'compare-sign': {
      expect(q.answer).toBe(signOf(q.left.value, q.right.value));
      for (const side of [q.left, q.right]) {
        expect(isNatInt(side.value)).toBe(true);
        expect(evalLabel(side.label)).toBe(side.value);
      }
      break;
    }
    case 'compare-pick': {
      const values = q.options.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
      q.options.forEach((o) => expect(evalLabel(o.label)).toBe(o.value));
      expect(q.answer).toBe(q.target === 'biggest' ? Math.max(...values) : Math.min(...values));
      break;
    }
    case 'chain': {
      const c = q as ChainQ;
      let cur = c.start;
      c.steps.forEach((s, i) => {
        if (s.op === '/') expect(cur % s.n).toBe(0);
        cur = applyOp(cur, s.op, s.n);
        expect(isNatInt(cur)).toBe(true);
        expect(cur).toBe(c.values[i]);
      });
      expect(cur).toBe(c.answer);
      break;
    }
  }
}

/** "12 + 5" / "3 × 4" / "7" -> value */
function evalLabel(label: string): number {
  const m = label.match(/^(\d+) ([+\-×÷]) (\d+)$/);
  if (!m) return Number(label);
  const op = ({ '+': '+', '-': '-', '×': 'x', '÷': '/' } as const)[m[2] as '+' | '-' | '×' | '÷'];
  return applyOp(Number(m[1]), op, Number(m[3]));
}

const stageQuestions = (level: LevelConfig, si: number) =>
  generateStage(level.stages[si].gameType, level.stages[si].params, level.seed + si * 101);

describe('world 2 level data', () => {
  it('has 30 levels, boss has 3 stages', () => {
    expect(world2Levels).toHaveLength(30);
    world2Levels.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
      expect(l.worldId).toBe('number');
      expect(l.stages.length).toBe(l.number === 30 ? 3 : 1);
      expect(l.parTimeSec).toBeGreaterThan(0);
      l.stages.forEach((s) => expect(s.instructions.length).toBeGreaterThan(0));
    });
  });

  it('consecutive levels use different mechanics', () => {
    for (let i = 1; i < 30; i++) expect(world2Levels[i].stages[0].gameType).not.toBe(world2Levels[i - 1].stages[0].gameType);
  });

  it('uses all five mechanics', () => {
    const types = new Set(world2Levels.flatMap((l) => l.stages.map((s) => s.gameType)));
    expect([...types].sort()).toEqual(['compare-numbers', 'math-challenge', 'mental-chain', 'missing-number', 'number-sequence']);
  });
});

describe.each(world2Levels.map((l) => [l.id, l] as const))('%s', (_id, level) => {
  it('generates valid, deterministic questions for every stage', () => {
    level.stages.forEach((stage, si) => {
      const qs = stageQuestions(level, si);
      const rounds = (stage.params.rounds as number) ?? 0;
      expect(qs).toHaveLength(rounds);
      expect(qs.length).toBeGreaterThanOrEqual(5);
      qs.forEach(checkQuestion);
      // no duplicate questions inside a stage
      expect(new Set(qs.map((q) => q.prompt)).size).toBe(qs.length);
      // deterministic
      expect(stageQuestions(level, si)).toEqual(qs);
    });
  });
});

describe('cross-level', () => {
  it('no two levels generate identical question sets', () => {
    const sigs = world2Levels.map((l) => l.stages.map((_, si) => stageQuestions(l, si).map((q) => q.prompt).join('|')).join('#'));
    expect(new Set(sigs).size).toBe(30);
  });

  it('beginner levels stay within 10 and use counting pictures', () => {
    world2Levels.slice(0, 5).forEach((l) => {
      stageQuestions(l, 0).forEach((q) => {
        if (q.kind === 'arith') {
          expect(Math.max(q.eq.a, q.eq.b, q.eq.c)).toBeLessThanOrEqual(10);
          expect((q as ArithQ).visual).toBeDefined();
        }
        if (q.kind === 'seq') expect(Math.max(...q.terms, q.answer)).toBeLessThanOrEqual(10);
        if (q.kind === 'compare-pick') expect((q as CompareQ).visual).toBeDefined();
      });
    });
  });
});

describe('generators across many seeds', () => {
  it('arithmetic, sequences and chains are always valid', () => {
    for (let s = 1; s < 300; s++) {
      genArith(createRng(s), { ops: ['+', '-', 'x', '/'], max: 100, table: 12, rounds: 6 }).forEach(checkQuestion);
      genSequence(createRng(s), { kinds: ['up', 'down', 'skip', 'double', 'growth', 'alternate'], length: 4, max: 60, rounds: 6 }).forEach(checkQuestion);
      genChain(createRng(s), { steps: 5, ops: ['+', '-', 'x', '/'], max: 100, rounds: 5 }).forEach(checkQuestion);
    }
  });
});
