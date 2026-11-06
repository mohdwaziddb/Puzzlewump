import type { LevelConfig, StageConfig } from '@/types';
import { makeLevel } from './makeLevel';

/** World 2 — Number Planet: 30 levels, level 30 is the boss (3 stages). */

const mc = (instructions: string, params: Record<string, unknown>): StageConfig => ({ gameType: 'math-challenge', instructions, params });
const mn = (instructions: string, params: Record<string, unknown>): StageConfig => ({ gameType: 'missing-number', instructions, params });
const seq = (instructions: string, params: Record<string, unknown>): StageConfig => ({ gameType: 'number-sequence', instructions, params });
const cmp = (instructions: string, params: Record<string, unknown>): StageConfig => ({ gameType: 'compare-numbers', instructions, params });
const chain = (instructions: string, params: Record<string, unknown>): StageConfig => ({ gameType: 'mental-chain', instructions, params });

export const world2Levels: LevelConfig[] = [
  // ---- beginner (1-5): counting pictures, within 10
  makeLevel('number', 1, 'Blast Off Sums', [mc('Count them all! How many?', { ops: ['+'], max: 5, rounds: 5, visual: true })], { parTimeSec: 35 }),
  makeLevel('number', 2, 'Star Groups', [cmp('Tap the group with more or less!', { mode: 'pick', max: 8, options: 3, visual: true, rounds: 5 })], { parTimeSec: 35 }),
  makeLevel('number', 3, 'Rocket Take-Away', [mc('Some flew away! How many are left?', { ops: ['-'], max: 8, rounds: 5, visual: true })], { parTimeSec: 40 }),
  makeLevel('number', 4, 'Moon Steps', [seq('What number comes next?', { kinds: ['up'], length: 4, max: 10, stepMax: 1, rounds: 5 })], { parTimeSec: 35 }),
  makeLevel('number', 5, 'Comet Counting', [mc('Add or take away!', { ops: ['+', '-'], max: 10, rounds: 6, visual: true })], { parTimeSec: 45 }),

  // ---- easy (6-10): within 20
  makeLevel('number', 6, 'Planet Hop', [mn('Find the missing number!', { ops: ['+'], max: 10, rounds: 5 })], { parTimeSec: 45 }),
  makeLevel('number', 7, 'Bigger or Smaller', [cmp('Is the left side bigger, smaller or the same?', { mode: 'sign', max: 20, rounds: 6 })], { parTimeSec: 40 }),
  makeLevel('number', 8, 'Skip Through Space', [seq('Count by jumps! What is next?', { kinds: ['skip', 'up'], length: 4, max: 50, stepMax: 3, rounds: 6 })], { parTimeSec: 50 }),
  makeLevel('number', 9, 'Space Train', [chain('Follow the train! What number do you get?', { steps: 2, ops: ['+', '-'], max: 15, rounds: 5 })], { parTimeSec: 60 }),
  makeLevel('number', 10, 'Asteroid Adding', [mc('Solve the sums!', { ops: ['+', '-'], max: 20, rounds: 6 })], { parTimeSec: 50 }),

  // ---- medium (11-15)
  makeLevel('number', 11, 'Galaxy Gaps', [mn('Which number fills the gap?', { ops: ['+', '-'], max: 20, rounds: 6 })], { parTimeSec: 60 }),
  makeLevel('number', 12, 'Countdown Crew', [seq('Up or down? Find the next number!', { kinds: ['down', 'up', 'skip'], length: 4, max: 30, stepMax: 5, rounds: 6 })], { parTimeSec: 60 }),
  makeLevel('number', 13, 'Moon Math Duel', [cmp('Work it out, then pick < = or >', { mode: 'sign', max: 20, expressions: true, ops: ['+', '-'], rounds: 6 })], { parTimeSec: 65 }),
  makeLevel('number', 14, 'Times Comets', [mc('Times tables! Pick the answer.', { ops: ['x'], table: 5, rounds: 6 })], { parTimeSec: 55 }),
  makeLevel('number', 15, 'Orbit Chain', [chain('Do each step in order!', { steps: 3, ops: ['+', '-'], max: 30, rounds: 6 })], { parTimeSec: 80 }),

  // ---- challenging (16-20)
  makeLevel('number', 16, 'Sharing Stars', [mc('Share and multiply!', { ops: ['x', '/'], table: 6, rounds: 6 })], { parTimeSec: 65 }),
  makeLevel('number', 17, 'Mystery Meteor', [mn('Find the hidden number!', { ops: ['+', '-', 'x'], max: 50, table: 6, rounds: 6 })], { parTimeSec: 75 }),
  makeLevel('number', 18, 'Growing Galaxy', [seq('The jumps grow! What is next?', { kinds: ['growth', 'skip', 'down'], length: 4, max: 60, stepMax: 8, rounds: 6 })], { parTimeSec: 75 }),
  makeLevel('number', 19, 'Biggest Planet', [cmp('Work it out and tap the right one!', { mode: 'pick', max: 30, options: 4, expressions: true, ops: ['+', '-', 'x'], rounds: 6 })], { parTimeSec: 75 }),
  makeLevel('number', 20, 'Rocket Fuel', [chain('Fuel up step by step!', { steps: 3, ops: ['+', '-', 'x'], max: 50, rounds: 6 })], { parTimeSec: 90 }),

  // ---- hard (21-25): two-digit numbers, timer
  makeLevel('number', 21, 'Black Hole Sums', [mc('Big number sums!', { ops: ['+', '-'], max: 100, rounds: 7 })], { parTimeSec: 85 }),
  makeLevel('number', 22, 'Double Stars', [seq('Doubles, zig-zags and growing jumps!', { kinds: ['double', 'alternate', 'growth'], length: 5, max: 200, rounds: 7 })], { parTimeSec: 95 }),
  makeLevel('number', 23, 'Alien Equations', [mn('Crack the alien code!', { ops: ['x', '/'], table: 10, rounds: 7 })], { parTimeSec: 95 }),
  makeLevel('number', 24, 'Nebula Showdown', [cmp('Which side wins? Pick < = or >', { mode: 'mix', max: 50, options: 4, expressions: true, ops: ['+', '-', 'x'], rounds: 7 })], { parTimeSec: 95 }),
  makeLevel('number', 25, 'Warp Chain', [chain('Warp through every step!', { steps: 4, ops: ['+', '-', 'x'], max: 60, rounds: 6 })], { parTimeSec: 110 }),

  // ---- expert (26-29): number pad, multi-step
  makeLevel('number', 26, 'Star Command', [mc('Type the answer, Commander!', { ops: ['x', '/'], table: 12, tableMin: 3, rounds: 7, input: 'pad' })], { parTimeSec: 100 }),
  makeLevel('number', 27, 'Cosmic Codes', [seq('Find the secret rule!', { kinds: ['up', 'down', 'skip', 'double', 'growth', 'alternate'], length: 5, max: 500, stepMax: 25, rounds: 7 })], { parTimeSec: 110 }),
  makeLevel('number', 28, 'Hyperspace Gaps', [mn('Fill every gap!', { ops: ['+', '-', 'x', '/'], max: 200, table: 12, rounds: 7 })], { parTimeSec: 115 }),
  makeLevel('number', 29, 'Mega Chain', [chain('Five steps! Type the final number.', { steps: 5, ops: ['+', '-', 'x', '/'], max: 100, rounds: 6, input: 'pad' })], { parTimeSec: 130 }),

  // ---- boss
  makeLevel(
    'number',
    30,
    'King of Number Planet',
    [
      mc('Stage 1: Mixed blast! Type the answer.', { ops: ['+', '-', 'x', '/'], max: 200, table: 12, tableMin: 3, rounds: 6, input: 'pad' }),
      seq('Stage 2: Break the secret codes!', { kinds: ['double', 'alternate', 'growth', 'skip', 'down'], length: 5, max: 400, stepMax: 30, rounds: 6 }),
      chain('Stage 3: The final warp! Follow every step.', { steps: 5, ops: ['+', '-', 'x', '/'], max: 120, rounds: 6 }),
    ],
    { parTimeSec: 260 },
  ),
];
