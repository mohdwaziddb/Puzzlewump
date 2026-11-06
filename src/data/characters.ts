import type { CharacterId, SaveData } from '@/types';

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  /** Human readable unlock rule */
  unlockText: string;
  /** Returns true when the unlock condition is met */
  isEarned: (s: SaveData, totalStars: number) => boolean;
  color: string;
}

export const CHARACTERS: CharacterInfo[] = [
  {
    id: 'max',
    name: 'Max',
    title: 'The Brave Explorer',
    description: 'Max loves maps, mountains and never gives up on a puzzle!',
    unlockText: 'Ready to play',
    isEarned: () => true,
    color: '#FF8A3D',
  },
  {
    id: 'mia',
    name: 'Mia',
    title: 'The Curious Genius',
    description: 'Mia asks a hundred questions a day and remembers every answer.',
    unlockText: 'Ready to play',
    isEarned: () => true,
    color: '#FF7EB6',
  },
  {
    id: 'coco',
    name: 'Coco',
    title: 'The Clever Fox',
    description: 'Coco sniffs out hidden objects and secret paths in no time.',
    unlockText: 'Earn 45 stars',
    isEarned: (_s, stars) => stars >= 45,
    color: '#F2802E',
  },
  {
    id: 'robo',
    name: 'Robo',
    title: 'The Funny Robot',
    description: 'Robo beeps, boops and calculates faster than a rocket.',
    unlockText: 'Beat the Number Planet boss',
    isEarned: (s) => !!s.levels['number-30']?.completed,
    color: '#4AA8FF',
  },
];

export const CHARACTER_BY_ID: Record<CharacterId, CharacterInfo> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
) as Record<CharacterId, CharacterInfo>;
