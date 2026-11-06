import type { GameType, PuzzleComponent } from '@/types';
import PatternGame from './PatternGame';
import OddOneOutGame from './OddOneOutGame';
import ShapeRotationGame from './ShapeRotationGame';
import MissingPieceGame from './MissingPieceGame';

/** Mechanics implemented in this folder, keyed by GameType. */
export const logicGames: Partial<Record<GameType, PuzzleComponent>> = {
  pattern: PatternGame,
  'odd-one-out': OddOneOutGame,
  'shape-rotation': ShapeRotationGame,
  'missing-piece': MissingPieceGame,
};

export { Shape } from './Shape';
