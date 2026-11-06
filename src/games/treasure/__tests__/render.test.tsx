import React, { act } from 'react';
import { createRoot } from 'test-renderer';
import { world5Levels } from '@/data/levels/world5';
import { treasureGames } from '../index';

jest.useFakeTimers();

describe('treasure components render', () => {
  const firstOfType = new Map<string, { params: Record<string, unknown>; seed: number }>();
  for (const l of world5Levels)
    l.stages.forEach((s, i) => {
      if (!firstOfType.has(s.gameType)) firstOfType.set(s.gameType, { params: s.params, seed: l.seed + i * 101 });
    });

  it.each([...firstOfType.entries()])('%s mounts, hints and unmounts', async (type, { params, seed }) => {
    const Comp = treasureGames[type as keyof typeof treasureGames]!;
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
    expect(props.onSolved).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
});
