import type { ComponentType } from 'react';

export type WorldId = 'memory' | 'number' | 'jungle' | 'logic' | 'treasure';

export type Tier =
  | 'beginner' // 1-5
  | 'easy' // 6-10
  | 'medium' // 11-15
  | 'challenging' // 16-20
  | 'hard' // 21-25
  | 'expert' // 26-29
  | 'boss'; // 30

/** Every playable mechanic in the game. Each maps to one React component. */
export type GameType =
  // Memory Kingdom
  | 'memory-match'
  | 'sequence-memory'
  | 'object-memory'
  | 'position-memory'
  | 'number-memory'
  // Number Planet
  | 'math-challenge'
  | 'missing-number'
  | 'number-sequence'
  | 'compare-numbers'
  | 'mental-chain'
  // Mystery Jungle
  | 'maze'
  | 'path-finder'
  | 'push-puzzle'
  | 'jungle-hidden'
  // Logic Galaxy
  | 'pattern'
  | 'odd-one-out'
  | 'shape-rotation'
  | 'missing-piece'
  // Treasure Island
  | 'find-difference'
  | 'hidden-object'
  | 'visual-counting'
  | 'object-matching'
  | 'treasure-hunt';

/** One playable stage. Normal levels have one stage, boss levels have 3. */
export interface StageConfig {
  gameType: GameType;
  /** Short kid-friendly instruction shown on the parchment banner. */
  instructions: string;
  /** Mechanic-specific parameters (owned by the game module that renders it). */
  params: Record<string, unknown>;
}

export interface LevelConfig {
  /** e.g. "memory-12" */
  id: string;
  worldId: WorldId;
  /** 1..30 */
  number: number;
  tier: Tier;
  title: string;
  stages: StageConfig[];
  /** Optional countdown for the whole level. Undefined = no timer. */
  timeLimitSec?: number;
  /** Hearts. Undefined = unlimited mistakes (still lowers stars). */
  lives?: number;
  /** Hints usable in this level. */
  maxHints: number;
  /** Completing within par time (with no mistakes/hints) earns 3 stars. */
  parTimeSec: number;
  /** Seed for deterministic content generation. */
  seed: number;
}

export interface SolveReport {
  /** Mistakes the puzzle counted itself (in addition to onMistake calls it already made). Usually 0. */
  extraMistakes?: number;
}

/**
 * Contract every mechanic component implements.
 * The host (GameHost) owns lives, timer, hints, pause and scoring.
 */
export interface PuzzleProps<P = Record<string, unknown>> {
  params: P;
  /** Deterministic seed. Use createRng(seed) for all randomness. */
  seed: number;
  /** Call exactly once when the stage is solved. */
  onSolved: (report?: SolveReport) => void;
  /** Call on every wrong action (host removes a heart, plays sound, shakes). */
  onMistake: () => void;
  /** Call on every correct intermediate action (plays a pleasant sound). */
  onCorrect?: () => void;
  /** Increments each time the player uses a hint. React to changes (useEffect) and give a helpful reveal. */
  hintSignal: number;
  /** True while pause menu is open — stop internal timers/animations that matter. */
  paused: boolean;
  /** Optional progress 0..1 for the host progress bar. */
  onProgress?: (fraction: number) => void;
  /** Available width (px) for the puzzle area. */
  width: number;
  /** Available height (px) for the puzzle area. */
  height: number;
}

export type PuzzleComponent = ComponentType<PuzzleProps<any>>;

export type CharacterId = 'max' | 'mia' | 'coco' | 'robo';
export type Expression = 'idle' | 'happy' | 'cheer' | 'think' | 'sad';

export interface LevelProgress {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  plays: number;
}

export interface DailyState {
  /** YYYY-MM-DD of last app open counted for streak */
  lastLoginDate: string | null;
  streak: number;
  bestStreak: number;
  /** Day index (0..6) of next login reward in the 7-day cycle */
  loginCycleDay: number;
  /** YYYY-MM-DD when login reward was last claimed */
  lastLoginRewardDate: string | null;
  /** Dates (YYYY-MM-DD) on which the daily challenge was completed */
  challengeDates: string[];
}

export interface Stats {
  levelsPlayed: number;
  levelsWon: number;
  mistakes: number;
  hintsUsed: number;
  playSeconds: number;
  perfectLevels: number;
  chestsOpened: number;
}

export interface SaveData {
  version: number;
  onboarded: boolean;
  selectedCharacter: CharacterId;
  unlockedCharacters: CharacterId[];
  coins: number;
  hints: number;
  levels: Record<string, LevelProgress>;
  achievements: Record<string, number>; // id -> unlocked timestamp
  claimedWorldChests: WorldId[];
  daily: DailyState;
  stats: Stats;
  lastWorld: WorldId;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  vibration: boolean;
}

export interface LevelResult {
  levelId: string;
  stars: 0 | 1 | 2 | 3;
  score: number;
  coins: number;
  mistakes: number;
  hintsUsed: number;
  timeSec: number;
  firstClear: boolean;
  newBest: boolean;
  isDaily: boolean;
  newAchievements: string[];
  unlockedCharacters: CharacterId[];
  worldCompleted: WorldId | null;
}
