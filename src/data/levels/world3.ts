import type { LevelConfig, StageConfig } from '@/types';
import { makeLevel } from './makeLevel';

/*
 * World 3 — Mystery Jungle. Mechanics rotate: maze -> path-finder -> push-puzzle -> jungle-hidden.
 * Params are owned by src/games/maze (see generators.ts for meanings).
 */

const maze = (size: number, keys = 0, bumpPenalty = false): StageConfig => ({
  gameType: 'maze',
  instructions:
    keys > 0 ? `Collect ${keys === 1 ? 'the gem' : `all ${keys} gems`}, then reach the temple!` : 'Find the way to the jungle temple!',
  params: { size, keys, bumpPenalty },
});

const path = (mode: 'choose' | 'program', size: number, steps: number, obstacles: number, rounds = 1): StageConfig => ({
  gameType: 'path-finder',
  instructions: mode === 'choose' ? 'Which arrows lead to the treasure?' : 'Tap arrows to plan the trip, then press Go!',
  params: { mode, size, steps, obstacles, rounds },
});

const push = (size: number, crates: number, scramble: number, rocks?: number): StageConfig => ({
  gameType: 'push-puzzle',
  instructions: crates === 1 ? 'Push the stone onto the glowing pad!' : 'Push every stone onto a glowing pad!',
  params: { size, crates, scramble, ...(rocks !== undefined ? { rocks } : {}) },
});

const hidden = (targets: number, distractors: number): StageConfig => ({
  gameType: 'jungle-hidden',
  instructions: 'Find the hidden things in the jungle!',
  params: { targets, distractors },
});

const J = 'jungle' as const;

export const world3Levels: LevelConfig[] = [
  // Beginner 1-5
  makeLevel(J, 1, 'Jungle Gate', [maze(5)], { parTimeSec: 25 }),
  makeLevel(J, 2, 'Arrow Trail', [path('choose', 4, 3, 2, 2)], { parTimeSec: 30 }),
  makeLevel(J, 3, 'First Stone Push', [push(4, 1, 3, 0)], { parTimeSec: 30 }),
  makeLevel(J, 4, 'Peek-a-Boo Leaves', [hidden(3, 5)], { parTimeSec: 25 }),
  makeLevel(J, 5, 'Vine Tunnels', [maze(6)], { parTimeSec: 30 }),
  // Easy 6-10
  makeLevel(J, 6, 'Monkey Code', [path('program', 4, 4, 3)], { parTimeSec: 35 }),
  makeLevel(J, 7, 'Rolling Rock Room', [push(5, 1, 5, 1)], { parTimeSec: 40 }),
  makeLevel(J, 8, 'Parrot Lookout', [hidden(4, 8)], { parTimeSec: 35 }),
  makeLevel(J, 9, 'Gem Glade', [maze(7, 1)], { parTimeSec: 40 }),
  makeLevel(J, 10, 'Riverbank Route', [path('choose', 5, 5, 5, 3)], { parTimeSec: 50 }),
  // Medium 11-15
  makeLevel(J, 11, 'Twin Boulders', [push(5, 2, 6, 1)], { parTimeSec: 60 }),
  makeLevel(J, 12, 'Fern Forest Finder', [hidden(5, 11)], { parTimeSec: 45 }),
  makeLevel(J, 13, 'Snake Hollow', [maze(8, 1, true)], { parTimeSec: 50 }),
  makeLevel(J, 14, 'Frog Hop Program', [path('program', 5, 6, 6)], { parTimeSec: 50 }),
  makeLevel(J, 15, 'Temple Courtyard', [push(6, 2, 8)], { parTimeSec: 75 }),
  // Challenging 16-20
  makeLevel(J, 16, 'Canopy Secrets', [hidden(6, 13)], { parTimeSec: 55 }),
  makeLevel(J, 17, 'Twisty Roots', [maze(9, 2, true)], { parTimeSec: 65 }),
  makeLevel(J, 18, 'Waterfall Arrows', [path('choose', 6, 7, 9, 3)], { parTimeSec: 60 }),
  makeLevel(J, 19, 'Mossy Ruins', [push(6, 2, 12, 3)], { parTimeSec: 90 }),
  makeLevel(J, 20, 'Butterfly Grove', [hidden(7, 15)], { parTimeSec: 60 }),
  // Hard 21-25 (tier timer 180s)
  makeLevel(J, 21, 'Tiger Trail', [maze(10, 2, true)], { parTimeSec: 75 }),
  makeLevel(J, 22, 'Explorer Code', [path('program', 6, 8, 10)], { parTimeSec: 70 }),
  makeLevel(J, 23, 'Three Stone Shrine', [push(6, 3, 10, 2)], { parTimeSec: 120, timeLimitSec: 240 }),
  makeLevel(J, 24, 'Misty Treetops', [hidden(8, 17)], { parTimeSec: 70 }),
  makeLevel(J, 25, 'Lost Ruins', [maze(11, 3, true)], { parTimeSec: 90 }),
  // Expert 26-29 (tier timer 150s)
  makeLevel(J, 26, 'Jungle Robot Run', [path('program', 6, 10, 11)], { parTimeSec: 80, timeLimitSec: 180 }),
  makeLevel(J, 27, 'Golden Idol Vault', [push(7, 3, 14, 4)], { parTimeSec: 140, timeLimitSec: 270 }),
  makeLevel(J, 28, 'Moonlight Jungle', [hidden(9, 20)], { parTimeSec: 80 }),
  makeLevel(J, 29, 'Great Labyrinth', [maze(13, 3, true)], { parTimeSec: 110, timeLimitSec: 200 }),
  // World boss: 3 stages mixing mechanics
  makeLevel(
    J,
    30,
    'Temple of the Jungle King',
    [
      { ...maze(11, 2, true), instructions: 'Stage 1: grab the gems and race to the temple!' },
      { ...push(6, 2, 10, 2), instructions: 'Stage 2: push the stones onto the temple pads!' },
      { ...path('program', 6, 9, 10), instructions: "Stage 3: code the path to the King's treasure!" },
    ],
    { parTimeSec: 210, timeLimitSec: 420 },
  ),
];
