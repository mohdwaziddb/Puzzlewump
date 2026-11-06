import { createRng } from '@/engine/rng';
import { tierForLevel } from '@/engine/DifficultyEngine';
import { world1Levels } from '@/data/levels/world1';
import type { GameType } from '@/types';
import {
  MEMORY_ITEMS,
  checkNumber,
  checkSequenceInput,
  generateMemoryStage,
  isAskedCell,
  isCarelessMismatch,
  isItemCell,
  isPair,
  isShownItem,
  partnerOf,
  sequenceForRound,
  type MemoryPuzzle,
} from '../generators';

const MEMORY_TYPES: GameType[] = ['memory-match', 'sequence-memory', 'object-memory', 'position-memory', 'number-memory'];

const stageSeed = (levelSeed: number, stage: number) => levelSeed + stage * 101;

function build(levelIdx: number, stageIdx: number): MemoryPuzzle {
  const lv = world1Levels[levelIdx];
  const st = lv.stages[stageIdx];
  const pz = generateMemoryStage(st.gameType, st.params, createRng(stageSeed(lv.seed, stageIdx)));
  if (!pz) throw new Error(`unknown game type ${st.gameType}`);
  return pz;
}

/** Validate a puzzle is solvable and the validators accept right / reject wrong answers. */
function checkPuzzle(m: MemoryPuzzle) {
  switch (m.type) {
    case 'memory-match': {
      const { cards, rows, cols } = m.puzzle;
      expect(rows * cols).toBeGreaterThanOrEqual(cards.length);
      expect(cards.length % 2).toBe(0);
      const counts = new Map<string, number>();
      cards.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
      counts.forEach((n) => expect(n).toBe(2));
      cards.forEach((_, i) => {
        const p = partnerOf(cards, i);
        expect(isPair(cards, i, p)).toBe(true);
        expect(isPair(cards, i, i)).toBe(false);
        const wrong = cards.findIndex((c, j) => j !== i && c !== cards[i]);
        expect(isPair(cards, i, wrong)).toBe(false);
        // gentle rule: unseen mismatch is not a mistake, a known card is
        expect(isCarelessMismatch(cards, new Set(), i, wrong)).toBe(false);
        expect(isCarelessMismatch(cards, new Set([wrong]), i, wrong)).toBe(true);
        expect(isCarelessMismatch(cards, new Set([p, wrong]), i, p)).toBe(false);
      });
      break;
    }
    case 'sequence-memory': {
      const pz = m.puzzle;
      expect(pz.sequence.length).toBe(pz.startLength + pz.rounds - 1);
      pz.sequence.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(pz.pads);
      });
      for (let i = 2; i < pz.sequence.length; i++) {
        expect(pz.sequence[i] === pz.sequence[i - 1] && pz.sequence[i] === pz.sequence[i - 2]).toBe(false);
      }
      for (let r = 0; r < pz.rounds; r++) {
        const t = sequenceForRound(pz, r);
        expect(t.length).toBe(pz.startLength + r);
        for (let k = 1; k < t.length; k++) expect(checkSequenceInput(t, t.slice(0, k))).toBe('ok');
        expect(checkSequenceInput(t, t)).toBe('done');
        const bad = [...t];
        bad[bad.length - 1] = (bad[bad.length - 1] + 1) % pz.pads;
        expect(checkSequenceInput(t, bad)).toBe('wrong');
        expect(checkSequenceInput(t, [(t[0] + 1) % pz.pads])).toBe('wrong');
      }
      break;
    }
    case 'object-memory': {
      const pz = m.puzzle;
      if (pz.mode === 'pick') {
        const r = pz.rounds[0];
        expect(new Set(r.pool).size).toBe(r.pool.length);
        expect(new Set(r.shown).size).toBe(r.shown.length);
        r.shown.forEach((s) => {
          expect(r.pool).toContain(s);
          expect(isShownItem(r, s)).toBe(true);
        });
        const distractors = r.pool.filter((p) => !r.shown.includes(p));
        expect(distractors.length).toBeGreaterThan(0);
        distractors.forEach((d) => expect(isShownItem(r, d)).toBe(false));
      } else {
        pz.rounds.forEach((r) => {
          expect(new Set(r.shown).size).toBe(r.shown.length);
          expect(r.shown).toContain(r.missing);
          const after = r.after.filter((x) => x !== null);
          expect(after).not.toContain(r.missing);
          expect(after.length).toBe(r.shown.length - 1);
          expect(new Set(r.choices).size).toBe(r.choices.length);
          expect(r.choices.filter((c) => c === r.missing)).toHaveLength(1);
          // distractors were never shown, so exactly one answer is right
          r.choices.filter((c) => c !== r.missing).forEach((c) => expect(r.shown).not.toContain(c));
        });
      }
      break;
    }
    case 'position-memory': {
      const pz = m.puzzle;
      const cells = pz.placed.map((p) => p.cell);
      expect(new Set(cells).size).toBe(cells.length);
      cells.forEach((c) => expect(c).toBeLessThan(pz.rows * pz.cols));
      expect(new Set(pz.placed.map((p) => p.item)).size).toBe(pz.placed.length);
      const empty = Array.from({ length: pz.rows * pz.cols }, (_, i) => i).filter((i) => !cells.includes(i));
      expect(empty.length).toBeGreaterThan(0);
      if (pz.mode === 'all') {
        cells.forEach((c) => expect(isItemCell(pz, c)).toBe(true));
        empty.forEach((c) => expect(isItemCell(pz, c)).toBe(false));
      } else {
        expect(pz.asks.length).toBeGreaterThan(0);
        expect(new Set(pz.asks).size).toBe(pz.asks.length);
        pz.asks.forEach((a, k) => {
          expect(isAskedCell(pz, k, pz.placed[a].cell)).toBe(true);
          empty.forEach((c) => expect(isAskedCell(pz, k, c)).toBe(false));
          pz.placed.filter((_, j) => j !== a).forEach((o) => expect(isAskedCell(pz, k, o.cell)).toBe(false));
        });
      }
      break;
    }
    case 'number-memory': {
      const pz = m.puzzle;
      expect(new Set(pz.numbers).size).toBe(pz.numbers.length);
      pz.numbers.forEach((n) => {
        expect(n).toMatch(new RegExp(`^[1-9][0-9]{${pz.digits - 1}}$`));
        expect(checkNumber(n, n)).toBe(true);
        expect(checkNumber(n, n.slice(0, -1))).toBe(false);
        const last = Number(n[n.length - 1]);
        expect(checkNumber(n, n.slice(0, -1) + String((last + 1) % 10))).toBe(false);
      });
      break;
    }
  }
}

describe('Memory Kingdom (world 1) levels', () => {
  it('has exactly 30 levels with the right tiers, ids and a 3-stage boss', () => {
    expect(world1Levels).toHaveLength(30);
    world1Levels.forEach((lv, i) => {
      expect(lv.number).toBe(i + 1);
      expect(lv.worldId).toBe('memory');
      expect(lv.tier).toBe(tierForLevel(i + 1));
      expect(lv.title.length).toBeGreaterThan(0);
      expect(lv.parTimeSec).toBeGreaterThan(0);
      if (lv.timeLimitSec !== undefined) expect(lv.parTimeSec).toBeLessThan(lv.timeLimitSec);
      expect(lv.stages.length).toBe(i === 29 ? 3 : 1);
      lv.stages.forEach((s) => {
        expect(MEMORY_TYPES).toContain(s.gameType);
        expect(s.instructions.length).toBeGreaterThan(5);
      });
    });
    expect(new Set(world1Levels[29].stages.map((s) => s.gameType)).size).toBe(3);
  });

  it('rotates mechanics so consecutive levels feel different', () => {
    for (let i = 1; i < 29; i++) {
      expect(world1Levels[i].stages[0].gameType).not.toBe(world1Levels[i - 1].stages[0].gameType);
    }
  });

  world1Levels.forEach((lv, li) => {
    lv.stages.forEach((st, si) => {
      it(`level ${lv.number} stage ${si + 1} (${st.gameType}) is valid and solvable`, () => {
        const pz = build(li, si);
        checkPuzzle(pz);
        // deterministic
        expect(build(li, si)).toEqual(pz);
      });
    });
  });

  it('no two levels produce identical puzzle content', () => {
    const seen = new Map<string, string>();
    world1Levels.forEach((lv, li) =>
      lv.stages.forEach((_, si) => {
        const key = JSON.stringify(build(li, si));
        expect(seen.get(key)).toBeUndefined();
        seen.set(key, `${lv.id}#${si}`);
      }),
    );
  });

  it('uses only known item names', () => {
    expect(new Set(MEMORY_ITEMS).size).toBe(MEMORY_ITEMS.length);
  });
});
