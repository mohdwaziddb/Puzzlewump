import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharacterId, LevelProgress, SaveData, Settings, WorldId } from '@/types';

/**
 * Local-only persistence (app-private AsyncStorage, no permissions needed).
 * - Versioned schema with a migration chain.
 * - Every write keeps the previous good save as a backup.
 * - Corrupted / missing data falls back to backup, then to defaults. Never throws.
 */
export const SAVE_KEY = 'bq.save';
export const BACKUP_KEY = 'bq.save.backup';
export const SETTINGS_KEY = 'bq.settings';
export const SAVE_VERSION = 1;

const CHARACTER_IDS: CharacterId[] = ['max', 'mia', 'coco', 'robo'];
const WORLD_IDS: WorldId[] = ['memory', 'number', 'jungle', 'logic', 'treasure'];

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    onboarded: false,
    selectedCharacter: 'max',
    unlockedCharacters: ['max', 'mia'],
    coins: 100,
    hints: 3,
    levels: {},
    achievements: {},
    claimedWorldChests: [],
    daily: {
      lastLoginDate: null,
      streak: 0,
      bestStreak: 0,
      loginCycleDay: 0,
      lastLoginRewardDate: null,
      challengeDates: [],
    },
    stats: {
      levelsPlayed: 0,
      levelsWon: 0,
      mistakes: 0,
      hintsUsed: 0,
      playSeconds: 0,
      perfectLevels: 0,
      chestsOpened: 0,
    },
    lastWorld: 'memory',
  };
}

export const defaultSettings = (): Settings => ({ music: true, sfx: true, vibration: false });

type Migration = (data: any) => any;
/** migrations[n] upgrades a save from version n to n+1. Add entries here when the schema changes. */
const migrations: Record<number, Migration> = {
  0: (d) => ({ ...d, version: 1 }),
};

export function migrate(raw: any): any {
  let d = raw;
  let v = typeof d?.version === 'number' ? d.version : 0;
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    if (!m) break;
    d = m(d);
    v = d.version;
  }
  return d;
}

const num = (v: unknown, fallback: number, min = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback;

/** Coerces any parsed object into a valid SaveData (drops garbage, keeps good fields). */
export function sanitizeSave(input: any): SaveData {
  const def = defaultSave();
  if (!input || typeof input !== 'object') return def;
  const d = migrate(input);

  const levels: Record<string, LevelProgress> = {};
  if (d.levels && typeof d.levels === 'object') {
    for (const [id, lp] of Object.entries<any>(d.levels)) {
      if (!lp || typeof lp !== 'object') continue;
      const stars = num(lp.stars, 0);
      levels[id] = {
        completed: !!lp.completed,
        stars: Math.min(3, stars) as LevelProgress['stars'],
        bestScore: num(lp.bestScore, 0),
        plays: num(lp.plays, 0),
      };
    }
  }
  const chars = Array.isArray(d.unlockedCharacters)
    ? d.unlockedCharacters.filter((c: any) => CHARACTER_IDS.includes(c))
    : [];
  const unlocked = Array.from(new Set<CharacterId>(['max', 'mia', ...chars]));
  const selected = CHARACTER_IDS.includes(d.selectedCharacter) && unlocked.includes(d.selectedCharacter)
    ? d.selectedCharacter
    : 'max';
  const ach: Record<string, number> = {};
  if (d.achievements && typeof d.achievements === 'object') {
    for (const [k, v] of Object.entries(d.achievements)) if (typeof v === 'number') ach[k] = v;
  }
  const daily = d.daily ?? {};
  const stats = d.stats ?? {};
  return {
    version: SAVE_VERSION,
    onboarded: !!d.onboarded,
    selectedCharacter: selected,
    unlockedCharacters: unlocked,
    coins: num(d.coins, def.coins),
    hints: num(d.hints, def.hints),
    levels,
    achievements: ach,
    claimedWorldChests: Array.isArray(d.claimedWorldChests)
      ? d.claimedWorldChests.filter((w: any) => WORLD_IDS.includes(w))
      : [],
    daily: {
      lastLoginDate: typeof daily.lastLoginDate === 'string' ? daily.lastLoginDate : null,
      streak: num(daily.streak, 0),
      bestStreak: num(daily.bestStreak, 0),
      loginCycleDay: num(daily.loginCycleDay, 0) % 7,
      lastLoginRewardDate:
        typeof daily.lastLoginRewardDate === 'string' ? daily.lastLoginRewardDate : null,
      challengeDates: Array.isArray(daily.challengeDates)
        ? daily.challengeDates.filter((x: any) => typeof x === 'string')
        : [],
    },
    stats: {
      levelsPlayed: num(stats.levelsPlayed, 0),
      levelsWon: num(stats.levelsWon, 0),
      mistakes: num(stats.mistakes, 0),
      hintsUsed: num(stats.hintsUsed, 0),
      playSeconds: num(stats.playSeconds, 0),
      perfectLevels: num(stats.perfectLevels, 0),
      chestsOpened: num(stats.chestsOpened, 0),
    },
    lastWorld: WORLD_IDS.includes(d.lastWorld) ? d.lastWorld : 'memory',
  };
}

function tryParse(json: string | null): any | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

export async function loadSave(): Promise<SaveData> {
  try {
    const main = tryParse(await AsyncStorage.getItem(SAVE_KEY));
    if (main) return sanitizeSave(main);
    const backup = tryParse(await AsyncStorage.getItem(BACKUP_KEY));
    if (backup) return sanitizeSave(backup);
  } catch {
    // storage unavailable — play with defaults
  }
  return defaultSave();
}

let lastGood: string | null = null;
let writing: Promise<void> = Promise.resolve();

/** Serialized writes; previous good save is kept as backup. */
export function writeSave(data: SaveData): Promise<void> {
  const json = JSON.stringify(data);
  writing = writing.then(async () => {
    try {
      if (lastGood) await AsyncStorage.setItem(BACKUP_KEY, lastGood);
      await AsyncStorage.setItem(SAVE_KEY, json);
      lastGood = json;
    } catch {
      // ignore: next save will retry
    }
  });
  return writing;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const s = tryParse(await AsyncStorage.getItem(SETTINGS_KEY));
    const d = defaultSettings();
    if (!s) return d;
    return {
      music: typeof s.music === 'boolean' ? s.music : d.music,
      sfx: typeof s.sfx === 'boolean' ? s.sfx : d.sfx,
      vibration: typeof s.vibration === 'boolean' ? s.vibration : d.vibration,
    };
  } catch {
    return defaultSettings();
  }
}

export async function writeSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export async function clearAll(): Promise<void> {
  lastGood = null;
  try {
    await AsyncStorage.multiRemove([SAVE_KEY, BACKUP_KEY]);
  } catch {
    // ignore
  }
}
