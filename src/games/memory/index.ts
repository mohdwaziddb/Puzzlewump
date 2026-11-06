import type { GameType, PuzzleComponent } from '@/types';
import MemoryMatch from './MemoryMatch';
import SequenceMemory from './SequenceMemory';
import ObjectMemory from './ObjectMemory';
import PositionMemory from './PositionMemory';
import NumberMemory from './NumberMemory';

/** Mechanics implemented in this folder, keyed by GameType. */
export const memoryGames: Partial<Record<GameType, PuzzleComponent>> = {
  'memory-match': MemoryMatch,
  'sequence-memory': SequenceMemory,
  'object-memory': ObjectMemory,
  'position-memory': PositionMemory,
  'number-memory': NumberMemory,
};
