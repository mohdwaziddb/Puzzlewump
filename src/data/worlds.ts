import type { WorldId } from '@/types';

export interface WorldInfo {
  id: WorldId;
  index: number;
  name: string;
  tagline: string;
  description: string;
  bossName: string;
}

export const WORLDS: WorldInfo[] = [
  {
    id: 'memory',
    index: 0,
    name: 'Memory Kingdom',
    tagline: 'Castles & secret gardens',
    description: 'Flip magic cards, repeat royal tunes and remember where the treasures hide.',
    bossName: 'The Forgetful Dragon',
  },
  {
    id: 'number',
    index: 1,
    name: 'Number Planet',
    tagline: 'Space math adventure',
    description: 'Blast through sums, find missing numbers and crack the star patterns.',
    bossName: 'Captain Calculo',
  },
  {
    id: 'jungle',
    index: 2,
    name: 'Mystery Jungle',
    tagline: 'Mazes & ancient temples',
    description: 'Find your way through twisty jungle paths and push stones to open the temple.',
    bossName: 'The Temple Guardian',
  },
  {
    id: 'logic',
    index: 3,
    name: 'Logic Galaxy',
    tagline: 'Patterns among the stars',
    description: 'Spot the odd alien, complete star patterns and rotate cosmic shapes.',
    bossName: 'The Puzzle Nebula',
  },
  {
    id: 'treasure',
    index: 4,
    name: 'Treasure Island',
    tagline: 'Pirates & hidden gold',
    description: 'Spot differences, count coins and follow the map to the golden treasure.',
    bossName: 'Pirate Queen Pearl',
  },
];

export const WORLD_BY_ID: Record<WorldId, WorldInfo> = Object.fromEntries(
  WORLDS.map((w) => [w.id, w]),
) as Record<WorldId, WorldInfo>;

export const LEVELS_PER_WORLD = 30;
