import type { GameType, PuzzleComponent } from '@/types';
import MathChallenge from './MathChallenge';
import MissingNumber from './MissingNumber';
import NumberSequence from './NumberSequence';
import CompareNumbers from './CompareNumbers';
import MentalChain from './MentalChain';

/** Mechanics implemented in this folder, keyed by GameType. */
export const mathGames: Partial<Record<GameType, PuzzleComponent>> = {
  'math-challenge': MathChallenge,
  'missing-number': MissingNumber,
  'number-sequence': NumberSequence,
  'compare-numbers': CompareNumbers,
  'mental-chain': MentalChain,
};
