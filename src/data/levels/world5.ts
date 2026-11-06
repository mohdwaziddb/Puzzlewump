import type { LevelConfig, StageConfig } from '@/types';
import { makeLevel } from './makeLevel';

/* Stage builders (params are owned by src/games/treasure). */
type Kind = 'missing' | 'extra' | 'color' | 'size' | 'flip' | 'rotate';

const diff = (differences: number, objects: number, kinds: Kind[], subtle = false): StageConfig => ({
  gameType: 'find-difference',
  instructions: `Find ${differences} differences between the pictures!`,
  params: { differences, objects, kinds, ...(subtle ? { subtle: true } : {}) },
});
const hidden = (targets: number, distractors: number, smallScale = false): StageConfig => ({
  gameType: 'hidden-object',
  instructions: 'Find all the treasures shown at the bottom!',
  params: { targets, distractors, ...(smallScale ? { smallScale: true } : {}) },
});
const count = (max: number, distractorKinds: number, rounds: number, input: 'choice' | 'pad' = 'choice'): StageConfig => ({
  gameType: 'visual-counting',
  instructions: input === 'pad' ? 'Count carefully, then type the number!' : 'Count the things and pick the number!',
  params: { max, distractorKinds, rounds, input },
});
const match = (pairs: number, rounds: number, decoys = 0, twist = false, similar = false): StageConfig => ({
  gameType: 'object-matching',
  instructions: pairs === 1 ? 'Match the treasure to its shadow!' : 'Match each treasure to its shadow!',
  params: { pairs, rounds, decoys, twist, similar },
});
const hunt = (steps: number, maxCoins: number, paths = 3, grid = 3): StageConfig => ({
  gameType: 'treasure-hunt',
  instructions: 'Follow the treasure map to the chest!',
  params: { steps, maxCoins, paths, grid },
});

const BASIC: Kind[] = ['missing', 'extra', 'color'];
const PLUS_SIZE: Kind[] = [...BASIC, 'size'];
const PLUS_FLIP: Kind[] = [...PLUS_SIZE, 'flip'];
const ALL: Kind[] = [...PLUS_FLIP, 'rotate'];

/** World 5 (treasure): 30 levels, level 30 is the boss (3 stages). */
export const world5Levels: LevelConfig[] = [
  makeLevel('treasure', 1, 'Spot the Seagull Swap', [diff(3, 8, BASIC)], { parTimeSec: 45 }),
  makeLevel('treasure', 2, 'Lost on the Beach', [hidden(3, 8)], { parTimeSec: 35 }),
  makeLevel('treasure', 3, 'Shell Counting Cove', [count(5, 1, 3)], { parTimeSec: 35 }),
  makeLevel('treasure', 4, 'Shadow Shore', [match(1, 3, 2)], { parTimeSec: 30 }),
  makeLevel('treasure', 5, 'First Treasure Map', [hunt(3, 5)], { parTimeSec: 50 }),
  makeLevel('treasure', 6, 'Parrot Puzzle Pictures', [diff(4, 10, BASIC)], { parTimeSec: 55 }),
  makeLevel('treasure', 7, 'Messy Pirate Camp', [hidden(4, 12)], { parTimeSec: 45 }),
  makeLevel('treasure', 8, 'Crab Count Lagoon', [count(7, 2, 3)], { parTimeSec: 40 }),
  makeLevel('treasure', 9, 'Shadows in the Sand', [match(2, 3, 1)], { parTimeSec: 40 }),
  makeLevel('treasure', 10, 'X Marks the Spot', [hunt(3, 7)], { parTimeSec: 55 }),
  makeLevel('treasure', 11, 'Captain Look-Alike', [diff(4, 12, PLUS_SIZE)], { parTimeSec: 60 }),
  makeLevel('treasure', 12, 'Treasure in the Clutter', [hidden(4, 16)], { parTimeSec: 50 }),
  makeLevel('treasure', 13, 'Starfish Sandbar', [count(9, 2, 4)], { parTimeSec: 55 }),
  makeLevel('treasure', 14, 'Sea Shadow Match', [match(3, 3, 1, false, true)], { parTimeSec: 55 }),
  makeLevel('treasure', 15, 'Map of Many Steps', [hunt(4, 8)], { parTimeSec: 70 }),
  makeLevel('treasure', 16, 'Mirror Mirror Island', [diff(5, 14, PLUS_FLIP)], { parTimeSec: 70 }),
  makeLevel('treasure', 17, 'Tiny Trinket Hunt', [hidden(5, 20, true)], { parTimeSec: 60 }),
  makeLevel('treasure', 18, 'Counting Doubloons', [count(10, 3, 4, 'pad')], { parTimeSec: 60 }),
  makeLevel('treasure', 19, 'Twisty Shadows', [match(3, 3, 2, true)], { parTimeSec: 60 }),
  makeLevel('treasure', 20, 'Tangled Trails', [hunt(4, 10, 4)], { parTimeSec: 75 }),
  makeLevel('treasure', 21, 'Spinning Sea Shells', [diff(5, 16, ALL)], { parTimeSec: 75 }),
  makeLevel('treasure', 22, 'The Hidden Hoard', [hidden(5, 24, true)], { parTimeSec: 70 }),
  makeLevel('treasure', 23, 'Busy Beach Count', [count(12, 3, 4, 'pad')], { parTimeSec: 70 }),
  makeLevel('treasure', 24, 'Shadow Crew Lineup', [match(4, 3, 2, true, true)], { parTimeSec: 70 }),
  makeLevel('treasure', 25, 'Skull Rock Map', [hunt(4, 12, 4, 4)], { parTimeSec: 80 }),
  makeLevel('treasure', 26, 'Sneaky Sea Changes', [diff(6, 18, ALL, true)], { parTimeSec: 85 }),
  makeLevel('treasure', 27, 'Needle in the Sandbox', [hidden(6, 28, true)], { parTimeSec: 80 }),
  makeLevel('treasure', 28, 'Great Gem Tally', [count(15, 4, 5, 'pad')], { parTimeSec: 90 }),
  makeLevel('treasure', 29, 'Eagle Eye Pirate', [diff(7, 20, ALL, true)], { parTimeSec: 100 }),
  makeLevel(
    'treasure',
    30,
    'Captain Blackbeard Showdown',
    [diff(6, 18, ALL, true), hidden(6, 26, true), hunt(4, 14, 4, 4)],
    { parTimeSec: 220 },
  ),
];
