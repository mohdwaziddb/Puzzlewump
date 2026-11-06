import React, { act } from 'react';

// The gesture-handler v3 native detector cannot run under jest: stub the two APIs SwipeArea uses.
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePanGesture: () => ({}),
}));
import { createRoot } from 'test-renderer';
import { world3Levels } from '@/data/levels/world3';
import { mazeGames } from '../index';

jest.useFakeTimers();

describe('jungle components render', () => {
  // first stage of every distinct (gameType, mode) + the boss stages
  const cases = new Map<string, { type: string; params: Record<string, unknown>; seed: number }>();
  for (const l of world3Levels)
    l.stages.forEach((s, i) => {
      const key = `${s.gameType}${s.params.mode ? `-${String(s.params.mode)}` : ''}${l.number === 30 ? '-boss' : ''}`;
      if (!cases.has(key)) cases.set(key, { type: s.gameType, params: s.params, seed: l.seed + i * 101 });
    });

  it.each([...cases.entries()])('%s mounts, hints and unmounts', async (_key, { type, params, seed }) => {
    const Comp = mazeGames[type as keyof typeof mazeGames]!;
    expect(Comp).toBeDefined();
    const props = {
      params,
      seed,
      onSolved: jest.fn(),
      onMistake: jest.fn(),
      onCorrect: jest.fn(),
      onProgress: jest.fn(),
      paused: false,
      width: 360,
      height: 520,
    };
    const root = createRoot();
    await act(async () => {
      root.render(<Comp {...props} hintSignal={0} />);
    });
    await act(async () => {
      root.render(<Comp {...props} hintSignal={1} />);
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      root.render(<Comp {...props} hintSignal={1} paused />);
      jest.advanceTimersByTime(8000);
    });
    expect(props.onSolved).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
});
