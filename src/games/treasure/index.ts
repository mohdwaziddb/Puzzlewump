import type { GameType, PuzzleComponent } from '@/types';
import FindDifference from './FindDifference';
import HiddenObject from './HiddenObject';
import VisualCounting from './VisualCounting';
import ObjectMatching from './ObjectMatching';
import TreasureHunt from './TreasureHunt';

/** Mechanics implemented in this folder, keyed by GameType. */
export const treasureGames: Partial<Record<GameType, PuzzleComponent>> = {
  'find-difference': FindDifference,
  'hidden-object': HiddenObject,
  'visual-counting': VisualCounting,
  'object-matching': ObjectMatching,
  'treasure-hunt': TreasureHunt,
};
