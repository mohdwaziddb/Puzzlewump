import type { SaveData, WorldId } from '@/types';
import { totalStars, worldCompletedCount } from '@/engine/LevelEngine';

export type BadgeArt = 'star' | 'trophy' | 'brain' | 'coin' | 'flame' | 'crown' | 'gem' | 'medal' | 'rocket' | 'chest';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  art: BadgeArt;
  color: string;
  reward: number; // coins
  /** current / target for progress bars */
  progress: (s: SaveData) => { current: number; target: number };
}

const levelsDone = (s: SaveData) => Object.values(s.levels).filter((l) => l.completed).length;
const world = (id: WorldId, name: string, color: string, art: BadgeArt): Achievement => ({
  id: `world-${id}`,
  name: `${name} Hero`,
  description: `Complete all 30 levels of ${name}`,
  art,
  color,
  reward: 150,
  progress: (s) => ({ current: worldCompletedCount(s, id), target: 30 }),
});

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Complete your first level', art: 'medal', color: '#4AA8FF', reward: 20, progress: (s) => ({ current: levelsDone(s), target: 1 }) },
  { id: 'ten-levels', name: 'On a Roll', description: 'Complete 10 levels', art: 'rocket', color: '#FF8A3D', reward: 40, progress: (s) => ({ current: levelsDone(s), target: 10 }) },
  { id: 'fifty-levels', name: 'Brain Explorer', description: 'Complete 50 levels', art: 'brain', color: '#9B6CF0', reward: 100, progress: (s) => ({ current: levelsDone(s), target: 50 }) },
  { id: 'hundred-levels', name: 'Mind Master', description: 'Complete 100 levels', art: 'crown', color: '#FFC93C', reward: 200, progress: (s) => ({ current: levelsDone(s), target: 100 }) },
  { id: 'all-levels', name: 'Brain Quest Legend', description: 'Complete all 150 levels', art: 'trophy', color: '#FFD23F', reward: 500, progress: (s) => ({ current: levelsDone(s), target: 150 }) },
  { id: 'stars-30', name: 'Star Catcher', description: 'Collect 30 stars', art: 'star', color: '#FFC93C', reward: 30, progress: (s) => ({ current: totalStars(s), target: 30 }) },
  { id: 'stars-150', name: 'Star Collector', description: 'Collect 150 stars', art: 'star', color: '#FF9A3D', reward: 100, progress: (s) => ({ current: totalStars(s), target: 150 }) },
  { id: 'stars-450', name: 'Superstar', description: 'Collect all 450 stars', art: 'star', color: '#FF5A5F', reward: 500, progress: (s) => ({ current: totalStars(s), target: 450 }) },
  { id: 'perfect-1', name: 'Perfect!', description: 'Finish a level with 3 stars, no mistakes, no hints', art: 'gem', color: '#22C3C9', reward: 25, progress: (s) => ({ current: s.stats.perfectLevels, target: 1 }) },
  { id: 'perfect-25', name: 'Flawless Mind', description: '25 perfect levels', art: 'gem', color: '#9B4DF0', reward: 150, progress: (s) => ({ current: s.stats.perfectLevels, target: 25 }) },
  { id: 'coins-500', name: 'Coin Keeper', description: 'Hold 500 coins at once', art: 'coin', color: '#FFD23F', reward: 0, progress: (s) => ({ current: s.coins, target: 500 }) },
  { id: 'streak-3', name: 'Daily Habit', description: 'Play 3 days in a row', art: 'flame', color: '#FF7A2E', reward: 30, progress: (s) => ({ current: s.daily.bestStreak, target: 3 }) },
  { id: 'streak-7', name: 'Week Warrior', description: 'Play 7 days in a row', art: 'flame', color: '#FF5A5F', reward: 100, progress: (s) => ({ current: s.daily.bestStreak, target: 7 }) },
  { id: 'daily-1', name: 'Challenger', description: 'Complete a Daily Challenge', art: 'medal', color: '#5DD43B', reward: 20, progress: (s) => ({ current: s.daily.challengeDates.length, target: 1 }) },
  { id: 'daily-10', name: 'Challenge Champ', description: 'Complete 10 Daily Challenges', art: 'trophy', color: '#2E9C17', reward: 120, progress: (s) => ({ current: s.daily.challengeDates.length, target: 10 }) },
  { id: 'chest-1', name: 'Treasure Finder', description: 'Open a world treasure chest', art: 'chest', color: '#B86B32', reward: 0, progress: (s) => ({ current: s.stats.chestsOpened, target: 1 }) },
  { id: 'all-friends', name: 'Best Friends', description: 'Unlock all 4 characters', art: 'crown', color: '#FF7EB6', reward: 100, progress: (s) => ({ current: s.unlockedCharacters.length, target: 4 }) },
  world('memory', 'Memory Kingdom', '#A46CF5', 'crown'),
  world('number', 'Number Planet', '#4C8DFF', 'rocket'),
  world('jungle', 'Mystery Jungle', '#5BC43A', 'medal'),
  world('logic', 'Logic Galaxy', '#9B4DF0', 'gem'),
  world('treasure', 'Treasure Island', '#FF9A3D', 'chest'),
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function isAchieved(a: Achievement, s: SaveData): boolean {
  const p = a.progress(s);
  return p.current >= p.target;
}
