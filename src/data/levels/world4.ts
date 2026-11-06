import type { LevelConfig, StageConfig } from '@/types';
import type { MissingParams, OddParams, PatternParams, RotationParams } from '@/games/logic/generators';
import { makeLevel } from './makeLevel';

const pat = (params: PatternParams): StageConfig => ({
  gameType: 'pattern',
  instructions: params.gap ? 'Find the missing shape!' : 'What comes next?',
  params: params as unknown as Record<string, unknown>,
});
const odd = (params: OddParams): StageConfig => ({
  gameType: 'odd-one-out',
  instructions: 'Tap the one that does not belong!',
  params: params as unknown as Record<string, unknown>,
});
const rot = (params: RotationParams): StageConfig => ({
  gameType: 'shape-rotation',
  instructions: params.allowMirrorDistractors ? 'Which one is turned, not flipped?' : 'Which one is the same shape turned?',
  params: params as unknown as Record<string, unknown>,
});
const miss = (params: MissingParams): StageConfig => ({
  gameType: 'missing-piece',
  instructions: 'Find the missing piece!',
  params: params as unknown as Record<string, unknown>,
});

const L = (n: number, title: string, stages: StageConfig[], parTimeSec: number) =>
  makeLevel('logic', n, title, stages, { parTimeSec });

/** World 4 (Logic Galaxy): 30 levels rotating pattern / odd-one-out / rotation / matrix; level 30 is the boss. */
export const world4Levels: LevelConfig[] = [
  // beginner
  L(1, 'Twinkle Steps', [pat({ unit: 'AB', attrs: ['color'], length: 5, options: 3, rounds: 4 })], 40),
  L(2, 'Space Picnic', [odd({ count: 4, attrs: ['category'], useItems: true, rounds: 4 })], 40),
  L(3, 'Spinning Blocks', [rot({ cells: 4, options: 3, allowMirrorDistractors: false, rounds: 4 })], 45),
  L(4, 'Color Constellation', [miss({ rules: ['row:color'], missing: 'corner', options: 3, rounds: 4 })], 50),
  L(5, 'Shape Comets', [pat({ unit: 'AB', attrs: ['kind'], length: 6, options: 3, rounds: 5 })], 45),
  // easy
  L(6, 'Wrong Color Moon', [odd({ count: 4, attrs: ['color'], rounds: 5 })], 40),
  L(7, 'Robot Turns', [rot({ cells: 4, options: 3, allowMirrorDistractors: false, rounds: 5 })], 55),
  L(8, 'Shape Columns', [miss({ rules: ['col:kind'], missing: 'corner', options: 3, rounds: 4 })], 55),
  L(9, 'Rainbow Rockets', [pat({ unit: 'ABC', attrs: ['color'], length: 7, options: 3, rounds: 5 })], 55),
  L(10, 'Alien Imposter', [odd({ count: 5, attrs: ['kind', 'size', 'category'], rounds: 5 })], 50),
  // medium
  L(11, 'Mirror Trick', [rot({ cells: 4, options: 4, allowMirrorDistractors: true, rounds: 5 })], 65),
  L(12, 'Counting Stars', [miss({ rules: ['grow:count', 'row:color'], missing: 'corner', options: 4, rounds: 4 })], 65),
  L(13, 'Double Orbit', [pat({ unit: ['AAB', 'ABB'], attrs: ['color', 'kind'], length: 7, options: 4, rounds: 5 })], 65),
  L(14, 'Stripes and Spots', [odd({ count: 5, attrs: ['fill', 'count'], noise: ['color'], rounds: 5 })], 60),
  L(15, 'Pentomino Pilot', [rot({ cells: 5, options: 4, allowMirrorDistractors: true, rounds: 5 })], 75),
  // challenging
  L(16, 'Sudoku Satellite', [miss({ rules: [['latin:kind'], ['latin:color']], missing: 'corner', options: 4, rounds: 5 })], 75),
  L(17, 'Missing Meteor', [pat({ unit: 'AABB', attrs: ['kind', 'color'], length: 9, gap: true, options: 4, rounds: 5 })], 75),
  L(18, 'Planet Detective', [odd({ count: 5, attrs: ['color', 'kind', 'size'], noise: ['fill'], rounds: 6 })], 70),
  L(19, 'Gravity Flip', [rot({ cells: 5, options: 4, allowMirrorDistractors: true, rounds: 6 })], 85),
  L(20, 'Matrix Moon Base', [miss({ rules: ['latin:color', 'row:kind'], missing: 'any', options: 4, rounds: 5 })], 90),
  // hard
  L(21, 'Growing Galaxy', [pat({ unit: ['grow', 'turn'], attrs: ['color'], length: 5, options: 4, rounds: 6 })], 85),
  L(22, 'Asteroid Sorting', [odd({ count: 6, attrs: ['fill', 'size', 'count'], noise: ['color', 'kind'], rounds: 6 })], 80),
  L(23, 'Hexa-Block Hangar', [rot({ cells: 6, options: 4, allowMirrorDistractors: true, rounds: 6 })], 95),
  L(24, 'Nebula Grid', [miss({ rules: ['latin:kind', 'col:fill'], missing: 'any', options: 4, rounds: 5 })], 100),
  L(25, 'Spinning Saturn', [pat({ unit: ['turn', 'ABC'], attrs: ['color', 'kind'], length: 7, gap: true, options: 4, rounds: 6 })], 95),
  // expert
  L(26, 'Impostor Hunt', [odd({ count: 6, attrs: ['color', 'kind', 'size', 'fill', 'count'], noise: ['fill', 'color'], rounds: 7 })], 90),
  L(27, 'Warp Drive Puzzle', [rot({ cells: 6, options: 5, allowMirrorDistractors: true, rounds: 6 })], 110),
  L(28, 'Quantum Grid', [miss({ rules: [['latin:kind', 'latin:color'], ['latin:fill', 'grow:count']], missing: 'any', options: 5, rounds: 5 })], 115),
  L(29, 'Black Hole Code', [pat({ unit: ['ABCD', 'AABB', 'ABB'], attrs: ['color', 'kind', 'fill'], length: 9, gap: true, options: 5, rounds: 6 })], 110),
  // boss
  L(
    30,
    'Galaxy Brain Boss',
    [
      pat({ unit: ['ABC', 'grow'], attrs: ['color', 'kind'], length: 7, gap: true, options: 4, rounds: 4 }),
      miss({ rules: ['latin:kind', 'row:color'], missing: 'any', options: 4, rounds: 4 }),
      rot({ cells: 5, options: 4, allowMirrorDistractors: true, rounds: 4 }),
    ],
    210,
  ),
];
