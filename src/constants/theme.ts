import type { WorldId } from '@/types';

export const colors = {
  sky: '#5BC0F8',
  skyDeep: '#2A8FDB',
  skyLight: '#BDE8FF',
  grass: '#6CCB3E',
  grassDeep: '#3E9A1E',
  leaf: '#2F7D32',
  yellow: '#FFC93C',
  yellowDeep: '#F29E0C',
  orange: '#FF8A3D',
  orangeDeep: '#D9601A',
  green: '#5DD43B',
  greenDeep: '#2E9C17',
  purple: '#9B6CF0',
  purpleDeep: '#6A3FC4',
  purpleLight: '#D9C9FF',
  pink: '#FF7EB6',
  pinkDeep: '#D84C8C',
  red: '#FF5A5F',
  redDeep: '#C9313A',
  blue: '#4AA8FF',
  blueDeep: '#1F6FD1',
  wood: '#B86B32',
  woodDeep: '#7A3F17',
  woodLight: '#E09A5B',
  parchment: '#FFF4DC',
  parchmentDeep: '#E8C994',
  cream: '#FFF9EE',
  white: '#FFFFFF',
  ink: '#3A2A1A',
  inkSoft: '#6B5843',
  shadow: 'rgba(40, 20, 0, 0.25)',
  overlay: 'rgba(20, 10, 40, 0.55)',
  gold: '#FFD23F',
  goldDeep: '#E0A400',
  locked: '#9AA3B2',
  lockedDeep: '#6B7486',
};

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  bold: 'Fredoka_600SemiBold',
  black: 'Fredoka_700Bold',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Per-world palette used by banners, buttons, level nodes and backgrounds. */
export interface WorldTheme {
  primary: string;
  primaryDeep: string;
  light: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDeep: string;
  accent: string;
}

export const worldThemes: Record<WorldId, WorldTheme> = {
  memory: {
    primary: '#A46CF5',
    primaryDeep: '#6B3BC7',
    light: '#E6D8FF',
    skyTop: '#7FD0FF',
    skyBottom: '#D8F1FF',
    ground: '#7CD34A',
    groundDeep: '#3F9A22',
    accent: '#FF7EB6',
  },
  number: {
    primary: '#4C8DFF',
    primaryDeep: '#2050C8',
    light: '#D3E3FF',
    skyTop: '#1B1F5E',
    skyBottom: '#5B3FA8',
    ground: '#8E6BE8',
    groundDeep: '#5B3FB5',
    accent: '#FFD23F',
  },
  jungle: {
    primary: '#5BC43A',
    primaryDeep: '#2E8A18',
    light: '#D8F5C8',
    skyTop: '#8EE0C0',
    skyBottom: '#E3FFD9',
    ground: '#4FAE2E',
    groundDeep: '#2B6E17',
    accent: '#FFB13D',
  },
  logic: {
    primary: '#9B4DF0',
    primaryDeep: '#5F23B0',
    light: '#ECD9FF',
    skyTop: '#140B3B',
    skyBottom: '#4A1C7E',
    ground: '#3D2A8C',
    groundDeep: '#24175E',
    accent: '#3DF5E0',
  },
  treasure: {
    primary: '#FF9A3D',
    primaryDeep: '#D2611A',
    light: '#FFE6CC',
    skyTop: '#5ED3FF',
    skyBottom: '#C9F4FF',
    ground: '#F7D58B',
    groundDeep: '#D9A84E',
    accent: '#22C3C9',
  },
};

/** Text style shorthand for chunky cartoon titles. */
export const textOutline = {
  textShadowColor: 'rgba(60, 25, 0, 0.55)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 2,
};
