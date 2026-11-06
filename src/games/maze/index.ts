import type { GameType, PuzzleComponent } from '@/types';
import MazeGame from './MazeGame';
import PathFinderGame from './PathFinderGame';
import PushPuzzleGame from './PushPuzzleGame';
import JungleHiddenGame from './JungleHiddenGame';

/** Mystery Jungle mechanics, keyed by GameType. */
export const mazeGames: Partial<Record<GameType, PuzzleComponent>> = {
  maze: MazeGame,
  'path-finder': PathFinderGame,
  'push-puzzle': PushPuzzleGame,
  'jungle-hidden': JungleHiddenGame,
};
