/// <reference types="jest" />
/// <reference types="node" />
import fs from 'fs';
import path from 'path';

type MockPlayer = {
  source: unknown;
  playing: boolean;
  loop: boolean;
  volume: number;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

const mockCreated: MockPlayer[] = [];
let mockThrow = false;

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn((source: unknown) => {
    const p: MockPlayer = {
      source,
      playing: false,
      loop: false,
      volume: 1,
      play: jest.fn(() => {
        if (mockThrow) throw new Error('native boom');
        p.playing = true;
      }),
      pause: jest.fn(() => {
        p.playing = false;
      }),
      seekTo: jest.fn(() => (mockThrow ? Promise.reject(new Error('seek boom')) : Promise.resolve())),
      remove: jest.fn(),
    };
    mockCreated.push(p);
    return p;
  }),
}));

type Svc = typeof import('../AudioService');

function load(): Svc['AudioService'] {
  let svc!: Svc['AudioService'];
  jest.isolateModules(() => {
    svc = (require('../AudioService') as Svc).AudioService;
  });
  return svc;
}

const musicPlayers = () => mockCreated.filter((p) => p.loop);

beforeEach(() => {
  jest.useFakeTimers();
  mockCreated.length = 0;
  mockThrow = false;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('AudioService', () => {
  it('init sets a no-recording, foreground-only audio mode and preloads sfx pools', async () => {
    const audio = load();
    await audio.init();
    const { setAudioModeAsync } = jest.requireMock('expo-audio');
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false }),
    );
    expect(mockCreated.length).toBeGreaterThanOrEqual(12);
  });

  it('play() does nothing when sfx disabled', async () => {
    const audio = load();
    await audio.init();
    audio.setSfxEnabled(false);
    audio.play('click');
    audio.play('correct');
    expect(mockCreated.every((p) => p.play.mock.calls.length === 0)).toBe(true);

    audio.setSfxEnabled(true);
    audio.play('click');
    expect(mockCreated.some((p) => p.play.mock.calls.length === 1)).toBe(true);
  });

  it('pooled sfx rotate players so rapid plays overlap', async () => {
    const audio = load();
    await audio.init();
    audio.play('pop');
    audio.play('pop');
    const used = mockCreated.filter((p) => p.play.mock.calls.length > 0);
    expect(used).toHaveLength(2);
  });

  it('playMusic switches tracks and does not restart the same track', () => {
    const audio = load();
    audio.playMusic('main');
    expect(musicPlayers()).toHaveLength(1);
    const main = musicPlayers()[0];
    expect(main.play).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(main.volume).toBeGreaterThan(0);

    audio.playMusic('main');
    expect(musicPlayers()).toHaveLength(1);
    expect(main.play).toHaveBeenCalledTimes(1);

    audio.playMusic('jungle');
    expect(musicPlayers()).toHaveLength(2);
    jest.advanceTimersByTime(1000);
    expect(main.remove).toHaveBeenCalled();
    expect(main.volume).toBe(0);
    expect(musicPlayers()[1].playing).toBe(true);
  });

  it('music toggle off pauses and on resumes the last requested track', () => {
    const audio = load();
    audio.playMusic('logic');
    const p = musicPlayers()[0];
    audio.setMusicEnabled(false);
    expect(p.pause).toHaveBeenCalled();
    expect(p.playing).toBe(false);

    // a request while muted is remembered
    audio.playMusic('treasure');
    expect(musicPlayers()).toHaveLength(1);

    audio.setMusicEnabled(true);
    expect(musicPlayers()).toHaveLength(2);
    expect(musicPlayers()[1].playing).toBe(true);
  });

  it('pauseAll / resumeAll pause and resume music', () => {
    const audio = load();
    audio.playMusic('memory');
    const p = musicPlayers()[0];
    audio.pauseAll();
    expect(p.playing).toBe(false);
    audio.play('click');
    expect(mockCreated.filter((x) => !x.loop).every((x) => x.play.mock.calls.length === 0)).toBe(true);
    audio.resumeAll();
    expect(p.playing).toBe(true);
    expect(musicPlayers()).toHaveLength(1);
  });

  it('swallows errors thrown by the player', async () => {
    const audio = load();
    await audio.init();
    mockThrow = true;
    expect(() => audio.play('click')).not.toThrow();
    expect(() => audio.playMusic('number')).not.toThrow();
    expect(() => audio.setMusicEnabled(false)).not.toThrow();
    expect(() => audio.setMusicEnabled(true)).not.toThrow();
    expect(() => audio.stopMusic()).not.toThrow();
    expect(() => audio.pauseAll()).not.toThrow();
    expect(() => audio.resumeAll()).not.toThrow();
    await Promise.resolve();
  });

  it('survives createAudioPlayer throwing', () => {
    const { createAudioPlayer } = jest.requireMock('expo-audio');
    createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no natives');
    });
    const audio = load();
    expect(() => audio.playMusic('main')).not.toThrow();
    expect(() => audio.play('star')).not.toThrow();
  });
});

describe('audio assets', () => {
  const dir = path.join(__dirname, '..', '..', '..', 'assets', 'audio');
  const sfx: import('../AudioService').SfxName[] = [
    'click', 'correct', 'wrong', 'star', 'coin', 'unlock', 'complete', 'chest', 'achievement', 'flip', 'pop', 'whoosh',
  ];
  const music: import('../AudioService').MusicName[] = ['main', 'memory', 'number', 'jungle', 'logic', 'treasure'];

  it.each(sfx)('sfx %s.wav exists and is a valid WAV', (name) => {
    const buf = fs.readFileSync(path.join(dir, `${name}.wav`));
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
  });

  it.each(music)('music_%s.wav exists', (name) => {
    expect(fs.existsSync(path.join(dir, `music_${name}.wav`))).toBe(true);
  });

  it('total audio size stays under ~5 MB', () => {
    const total = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
    expect(total).toBeLessThan(5 * 1024 * 1024);
  });
});
