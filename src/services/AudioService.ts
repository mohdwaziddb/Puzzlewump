/**
 * AudioService — contract used by the whole app.
 * Plays bundled, procedurally generated WAV files (see scripts/gen-audio.js) through expo-audio.
 * Every method is safe to call at any time and never throws; the game is fully playable when muted
 * or when audio is unavailable (web autoplay limits, missing natives in tests, etc.).
 */
import type { AudioPlayer } from 'expo-audio';
import type { WorldId } from '@/types';

export type SfxName =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'star'
  | 'coin'
  | 'unlock'
  | 'complete'
  | 'chest'
  | 'achievement'
  | 'flip'
  | 'pop'
  | 'whoosh';

export type MusicName = 'main' | WorldId;

// Static requires so the bundler packs the files (100% offline).
const SFX_SOURCES: Record<SfxName, number> = {
  click: require('../../assets/audio/click.wav'),
  correct: require('../../assets/audio/correct.wav'),
  wrong: require('../../assets/audio/wrong.wav'),
  star: require('../../assets/audio/star.wav'),
  coin: require('../../assets/audio/coin.wav'),
  unlock: require('../../assets/audio/unlock.wav'),
  complete: require('../../assets/audio/complete.wav'),
  chest: require('../../assets/audio/chest.wav'),
  achievement: require('../../assets/audio/achievement.wav'),
  flip: require('../../assets/audio/flip.wav'),
  pop: require('../../assets/audio/pop.wav'),
  whoosh: require('../../assets/audio/whoosh.wav'),
};

const MUSIC_SOURCES: Record<MusicName, number> = {
  main: require('../../assets/audio/music_main.wav'),
  memory: require('../../assets/audio/music_memory.wav'),
  number: require('../../assets/audio/music_number.wav'),
  jungle: require('../../assets/audio/music_jungle.wav'),
  logic: require('../../assets/audio/music_logic.wav'),
  treasure: require('../../assets/audio/music_treasure.wav'),
};

/** Number of players per SFX (more = allows overlapping rapid plays). */
const POOL_SIZE: Partial<Record<SfxName, number>> = { click: 3, pop: 3, correct: 2, coin: 3, flip: 2 };
const SFX_VOLUME = 0.9;
const MUSIC_VOLUME = 0.55; // music sits under the SFX
const FADE_MS = 400;
const FADE_STEP_MS = 40;

type ExpoAudioModule = typeof import('expo-audio');

let sfxEnabled = true;
let musicEnabled = true;
let appPaused = false;

let audioMod: ExpoAudioModule | null | undefined; // undefined = not loaded yet, null = unavailable
const sfxPools = new Map<SfxName, { players: AudioPlayer[]; next: number }>();
let current: { name: MusicName; player: AudioPlayer } | null = null;
let requestedMusic: MusicName | null = null;
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();
let initPromise: Promise<void> | null = null;

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function getAudio(): ExpoAudioModule | null {
  if (audioMod === undefined) {
    audioMod =
      safe(() => {
        const m = require('expo-audio') as ExpoAudioModule;
        return m && typeof m.createAudioPlayer === 'function' ? m : null;
      }) ?? null;
  }
  return audioMod;
}

function createPlayer(source: number): AudioPlayer | null {
  const m = getAudio();
  if (!m) return null;
  return safe(() => m.createAudioPlayer(source)) ?? null;
}

function cancelFade(p: AudioPlayer) {
  const id = fades.get(p);
  if (id !== undefined) {
    clearInterval(id);
    fades.delete(p);
  }
}

function releasePlayer(p: AudioPlayer) {
  cancelFade(p);
  safe(() => p.pause());
  safe(() => {
    if (typeof p.remove === 'function') p.remove();
    else (p as unknown as { release?: () => void }).release?.();
  });
}

function setVolume(p: AudioPlayer, v: number) {
  safe(() => {
    p.volume = Math.max(0, Math.min(1, v));
  });
}

/** Ramp volume with setInterval; the interval is always cleaned up. */
function fade(p: AudioPlayer, to: number, ms: number, onDone?: () => void) {
  cancelFade(p);
  const from = safe(() => p.volume) ?? 0;
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let i = 0;
  const id = setInterval(() => {
    i++;
    setVolume(p, from + ((to - from) * i) / steps);
    if (i >= steps) {
      cancelFade(p);
      safe(() => onDone?.());
    }
  }, FADE_STEP_MS);
  fades.set(p, id);
}

function getPool(name: SfxName) {
  let pool = sfxPools.get(name);
  if (!pool) {
    const players: AudioPlayer[] = [];
    const size = POOL_SIZE[name] ?? 1;
    for (let i = 0; i < size; i++) {
      const p = createPlayer(SFX_SOURCES[name]);
      if (!p) break;
      setVolume(p, SFX_VOLUME);
      players.push(p);
    }
    if (players.length === 0) return null; // not cached: audio may become available later
    pool = { players, next: 0 };
    sfxPools.set(name, pool);
  }
  return pool;
}

function fadeOutAndRelease(p: AudioPlayer) {
  fade(p, 0, FADE_MS / 2, () => releasePlayer(p));
}

/** Start (or resume) the given track, fading in; fades out any other track. */
function startMusic(name: MusicName) {
  if (current && current.name === name) {
    const p = current.player;
    if (!safe(() => p.playing)) {
      setVolume(p, 0);
      safe(() => p.play());
    }
    fade(p, MUSIC_VOLUME, FADE_MS);
    return;
  }
  if (current) {
    const old = current.player;
    current = null;
    fadeOutAndRelease(old);
  }
  const p = createPlayer(MUSIC_SOURCES[name]);
  if (!p) return;
  safe(() => {
    p.loop = true;
  });
  setVolume(p, 0);
  current = { name, player: p };
  safe(() => p.play());
  fade(p, MUSIC_VOLUME, FADE_MS);
}

function pauseMusicNow() {
  if (!current) return;
  const p = current.player;
  cancelFade(p);
  safe(() => p.pause());
}

function pauseAllSfx() {
  sfxPools.forEach((pool) => pool.players.forEach((p) => safe(() => p.pause())));
}

export const AudioService = {
  async init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const m = getAudio();
        if (!m) return;
        try {
          await m.setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: 'mixWithOthers',
            allowsRecording: false,
          });
        } catch {
          // unsupported on this platform — fine
        }
        (Object.keys(SFX_SOURCES) as SfxName[]).forEach((n) => safe(() => getPool(n)));
      } catch {
        // audio is optional
      }
    })();
    return initPromise;
  },

  setSfxEnabled(on: boolean) {
    sfxEnabled = on;
    if (!on) safe(pauseAllSfx);
  },

  setMusicEnabled(on: boolean) {
    musicEnabled = on;
    try {
      if (!on) pauseMusicNow();
      else if (requestedMusic && !appPaused) startMusic(requestedMusic);
    } catch {
      // ignore
    }
  },

  play(name: SfxName) {
    if (!sfxEnabled || appPaused) return;
    try {
      const pool = getPool(name);
      if (!pool) return;
      const p = pool.players[pool.next];
      pool.next = (pool.next + 1) % pool.players.length;
      safe(() => {
        const r = p.seekTo(0) as Promise<void> | undefined;
        if (r && typeof r.catch === 'function') r.catch(() => {});
      });
      safe(() => p.play());
    } catch {
      // ignore
    }
  },

  playMusic(name: MusicName) {
    requestedMusic = name;
    if (!musicEnabled || appPaused) return;
    try {
      const cur = current;
      if (cur && cur.name === name && safe(() => cur.player.playing)) return; // already playing
      startMusic(name);
    } catch {
      // ignore
    }
  },

  stopMusic() {
    requestedMusic = null;
    try {
      if (current) {
        const old = current.player;
        current = null;
        fadeOutAndRelease(old);
      }
    } catch {
      // ignore
    }
  },

  /** pause music while app is backgrounded */
  pauseAll() {
    appPaused = true;
    try {
      pauseMusicNow();
      pauseAllSfx();
    } catch {
      // ignore
    }
  },

  resumeAll() {
    appPaused = false;
    try {
      if (musicEnabled && requestedMusic) startMusic(requestedMusic);
    } catch {
      // ignore
    }
  },
};
