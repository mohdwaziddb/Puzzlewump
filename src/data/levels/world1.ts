import type { LevelConfig, StageConfig } from '@/types';
import { makeLevel } from './makeLevel';

/*
 * World 1 — Memory Kingdom (castle & fantasy garden).
 * Mechanics rotate so neighbouring levels feel different; params grow with the tier.
 * Stage params are read by src/games/memory/generators.ts.
 */

const match = (pairs: number, cols: number, peekMs = 0, instructions = 'Flip two cards. Find the matching pairs!'): StageConfig => ({
  gameType: 'memory-match',
  instructions,
  params: { pairs, cols, ...(peekMs ? { peekMs } : {}) },
});

const sequence = (pads: number, startLength: number, rounds: number, stepMs = 650, instructions = 'Watch the magic stones glow, then tap them in the same order!'): StageConfig => ({
  gameType: 'sequence-memory',
  instructions,
  params: { pads, startLength, rounds, stepMs },
});

const pick = (count: number, pool: number, showMs: number, instructions = `Remember the ${count} things. Then tap them all!`): StageConfig => ({
  gameType: 'object-memory',
  instructions,
  params: { mode: 'pick', count, pool, showMs },
});

const missing = (count: number, rounds: number, showMs: number, shuffle: boolean, instructions = 'Look closely! Which one went missing?'): StageConfig => ({
  gameType: 'object-memory',
  instructions,
  params: { mode: 'missing', count, rounds, showMs, shuffle },
});

const spots = (rows: number, cols: number, count: number, showMs: number, instructions = 'Remember where the friends hide. Tap those spots!'): StageConfig => ({
  gameType: 'position-memory',
  instructions,
  params: { mode: 'all', rows, cols, count, showMs },
});

const where = (rows: number, cols: number, count: number, asks: number, showMs: number, instructions = 'Remember the garden. Where was each thing?'): StageConfig => ({
  gameType: 'position-memory',
  instructions,
  params: { mode: 'which', rows, cols, count, asks, showMs },
});

const digits = (n: number, rounds: number, showMs: number, instructions = `Remember the ${n}-digit code. Type it in!`): StageConfig => ({
  gameType: 'number-memory',
  instructions,
  params: { digits: n, rounds, showMs },
});

/** Rough time (seconds) a focused child needs for a stage, used for 3-star par time. */
export function stageSeconds(s: StageConfig): number {
  const p = s.params as Record<string, unknown>;
  const n = (k: string, d = 0) => (typeof p[k] === 'number' ? (p[k] as number) : d);
  switch (s.gameType) {
    case 'memory-match':
      return 8 + n('pairs') * 5 + n('peekMs') / 1000;
    case 'sequence-memory': {
      let t = 0;
      for (let r = 0; r < n('rounds'); r++) {
        const len = n('startLength') + r;
        t += 1.5 + len * (n('stepMs', 650) / 1000) * 1.45 + len * 0.9;
      }
      return t + 4;
    }
    case 'object-memory':
      return p.mode === 'pick'
        ? n('showMs') / 1000 + n('count') * 3 + 6
        : n('rounds', 1) * (n('showMs') / 1000 + 6) + 3;
    case 'position-memory':
      return n('showMs') / 1000 + (p.mode === 'which' ? n('asks') * 3.5 : n('count') * 2.5) + 6;
    case 'number-memory':
      return n('rounds') * (n('showMs') / 1000 + n('digits') * 1.2 + 3) + 2;
    default:
      return 30;
  }
}

function level(n: number, title: string, stages: StageConfig[]): LevelConfig {
  // + 2s per boss stage-intro banner
  const total = stages.reduce((t, s) => t + stageSeconds(s), 0) + (stages.length - 1) * 2;
  return makeLevel('memory', n, title, stages, { parTimeSec: Math.ceil(total / 5) * 5 });
}

/** World 1 (memory): 30 levels, level 30 is the boss (3 stages). */
export const world1Levels: LevelConfig[] = [
  // Beginner 1-5
  level(1, 'Castle Card Friends', [match(3, 3, 2500, 'Peek at the cards, then find the matching pairs!')]),
  level(2, 'Glowing Garden Stones', [sequence(3, 2, 3, 750)]),
  level(3, "The Queen's Treasures", [pick(3, 6, 5000)]),
  level(4, 'Hide and Seek Hedge', [spots(3, 3, 3, 4000)]),
  level(5, 'Magic Door Code', [digits(2, 3, 3000)]),
  // Easy 6-10
  level(6, 'Fairy Bell Song', [sequence(4, 2, 4, 700)]),
  level(7, 'Royal Picture Cards', [match(4, 4, 1500)]),
  level(8, 'Wizard Number Scroll', [digits(3, 3, 3000)]),
  level(9, 'Who Left the Garden?', [missing(4, 2, 4500, false)]),
  level(10, 'Gnome Hiding Spots', [spots(3, 4, 4, 4000)]),
  // Medium 11-15
  level(11, 'Dragon Gift Basket', [pick(4, 8, 4500)]),
  level(12, 'Banquet Hall Pairs', [match(6, 4)]),
  level(13, 'Lost in the Maze Garden', [where(3, 3, 3, 3, 4000)]),
  level(14, 'Tower Bells Tune', [sequence(4, 3, 4, 650)]),
  level(15, 'Secret Vault Code', [digits(4, 3, 3500)]),
  // Challenging 16-20
  level(16, 'Grand Ballroom Pairs', [match(8, 4)]),
  level(17, 'The Sneaky Goblin', [missing(5, 3, 4000, true, 'The goblin took one thing! Which one is gone?')]),
  level(18, 'Crystal Stone Chant', [sequence(5, 3, 5, 600)]),
  level(19, 'Knight Gate Numbers', [digits(4, 4, 3000)]),
  level(20, 'Moonlit Courtyard', [spots(4, 4, 5, 4000)]),
  // Hard 21-25
  level(21, 'Royal Library Cards', [match(10, 4)]),
  level(22, 'Enchanted Rose Garden', [where(4, 4, 4, 4, 5000)]),
  level(23, "The King's Feast", [pick(6, 12, 5500)]),
  level(24, "Wizard's Long Code", [digits(5, 3, 4000)]),
  level(25, 'Rainbow Stone Circle', [sequence(6, 3, 5, 550)]),
  // Expert 26-29
  level(26, 'Hall of Mirrors', [match(12, 4)]),
  level(27, 'Dragon Lock Numbers', [digits(6, 3, 4500)]),
  level(28, 'Goblin Night Raid', [missing(6, 3, 4000, true, 'Goblins again! Spot what disappeared.')]),
  level(29, 'Starry Hedge Maze', [spots(5, 5, 7, 4500)]),
  // Boss 30
  level(30, 'The Forgetful Dragon', [
    sequence(6, 4, 4, 550, 'Stage 1: Copy the dragon song!'),
    match(10, 4, 0, 'Stage 2: Match the treasure cards!'),
    where(4, 4, 5, 4, 4500, 'Stage 3: Where did the dragon hide each thing?'),
  ]),
];
