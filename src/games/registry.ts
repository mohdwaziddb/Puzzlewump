import type { GameType, PuzzleComponent } from '@/types';
import { memoryGames } from './memory';
import { mathGames } from './math';
import { mazeGames } from './maze';
import { logicGames } from './logic';
import { treasureGames } from './treasure';

export const GAME_REGISTRY: Partial<Record<GameType, PuzzleComponent>> = {
  ...memoryGames,
  ...mathGames,
  ...mazeGames,
  ...logicGames,
  ...treasureGames,
};

export function getPuzzleComponent(t: GameType): PuzzleComponent | undefined {
  return GAME_REGISTRY[t];
}
