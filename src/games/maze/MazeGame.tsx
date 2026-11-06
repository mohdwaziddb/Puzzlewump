/**
 * 'maze' — guide the explorer through a seeded perfect maze to the jungle temple.
 * D-pad or swipe: the explorer runs along the corridor until the next junction.
 * Higher tiers: collect every gem first (the temple gate opens when all are found).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ItemIcon } from '@/art/items';
import { AudioService } from '@/services/AudioService';
import { GameText } from '@/components/ui';
import { PopIn, useHintEffect, usePuzzle, useTimers } from '@/games/shared';
import { generateMaze, mazeDistances, mazePath, mazeRun, dirBetween, type Dir, type MazeParams } from './generators';
import { BoardFrame, FootprintLayer, GridToken, MazeSvg, FRAME } from './kit/boards';
import { DPad, DPAD_HEIGHT, SwipeArea, useGentleMistake } from './kit/controls';
import { ExplorerToken, TempleArt } from './kit/art';

const STEP_MS = 110;

export default function MazeGame(props: PuzzleProps<MazeParams>) {
  const { params, seed, onSolved, onMistake, onCorrect, onProgress, hintSignal, paused, width, height } = props;
  const maze = usePuzzle(seed, () => generateMaze(seed, params), [params.size, params.keys]);
  const n = maze.size;
  const [pos, setPos] = useState(maze.start);
  const [got, setGot] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState<{ n: number; dir: Dir }>({ n: 0, dir: 'U' });
  const [hint, setHint] = useState<{ cell: number; dir: Dir }[]>([]);
  const solvedRef = useRef(false);
  const bestProgress = useRef(0);
  const { later } = useTimers();
  const hideHint = useRef<(() => void) | null>(null);
  const gentle = useGentleMistake(onMistake, !!params.bumpPenalty);

  const startDist = useMemo(() => mazeDistances(maze, maze.goal)[maze.start], [maze]);
  const keysLeft = maze.keys.filter((k) => !got.includes(k));
  const gateOpen = keysLeft.length === 0;

  // layout
  const btn = Math.max(48, Math.min(64, Math.floor(height * 0.11)));
  const counterH = maze.keys.length ? 34 : 0;
  const boardMax = Math.min(width - FRAME * 2 - 4, height - DPAD_HEIGHT(btn) - counterH - 30);
  const cell = Math.max(14, Math.floor(boardMax / n));
  const boardPx = cell * n;

  const progress = useCallback(
    (cell: number, collected: number) => {
      const d = mazeDistances(maze, maze.goal)[cell];
      const keyPart = maze.keys.length ? (collected / maze.keys.length) * 0.4 : 0;
      const pathPart = (1 - d / Math.max(1, startDist)) * (maze.keys.length ? 0.6 : 1);
      const f = Math.max(bestProgress.current, Math.min(0.99, keyPart + Math.max(0, pathPart)));
      bestProgress.current = f;
      onProgress?.(f);
    },
    [maze, startDist, onProgress],
  );

  const move = useCallback(
    (dir: Dir) => {
      if (paused || busy || solvedRef.current) return;
      const stops = new Set<number>([maze.goal, ...keysLeft]);
      const run = mazeRun(maze, pos, dir, stops);
      if (!run.length) {
        setBump((b) => ({ n: b.n + 1, dir }));
        AudioService.play('wrong');
        gentle();
        return;
      }
      AudioService.play('whoosh');
      setHint([]);
      setBusy(true);
      let collected = got;
      run.forEach((c, k) => {
        later(() => {
          setPos(c);
          if (maze.keys.includes(c) && !collected.includes(c)) {
            collected = [...collected, c];
            setGot(collected);
            AudioService.play('coin');
            onCorrect?.();
          }
          if (k === run.length - 1) {
            setBusy(false);
            progress(c, collected.length);
            if (c === maze.goal && collected.length === maze.keys.length && !solvedRef.current) {
              solvedRef.current = true;
              onProgress?.(1);
              AudioService.play('correct');
              later(() => onSolved(), 350);
            }
          }
        }, k * STEP_MS);
      });
    },
    [paused, busy, maze, keysLeft, pos, got, gentle, later, onCorrect, onProgress, onSolved, progress],
  );

  useHintEffect(hintSignal, () => {
    const target = keysLeft.length
      ? keysLeft.reduce((best, k) => (mazePath(maze, pos, k)!.length < mazePath(maze, pos, best)!.length ? k : best))
      : maze.goal;
    const path = mazePath(maze, pos, target);
    if (!path) return;
    const steps = path.slice(1, 7).map((c, i) => ({ cell: c, dir: dirBetween(path[i], c, n) }));
    hideHint.current?.();
    setHint(steps);
    hideHint.current = later(() => setHint([]), 6000);
  });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly' }}>
      {maze.keys.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: counterH }}>
          {maze.keys.map((k) => (
            <View key={k} style={{ opacity: got.includes(k) ? 1 : 0.3 }}>
              <PopIn k={got.includes(k) ? `g${k}` : `n${k}`}>
                <ItemIcon name="gem" size={28} />
              </PopIn>
            </View>
          ))}
          <GameText size={16} color="#fff" weight="black" outline>
            {gateOpen ? ' Gate open!' : ` ${got.length}/${maze.keys.length}`}
          </GameText>
        </View>
      )}
      <SwipeArea onSwipe={move} enabled={!paused}>
        <BoardFrame width={boardPx} height={boardPx}>
          <MazeSvg maze={maze} cell={cell} />
          <GridToken index={maze.goal} cols={n} cell={cell}>
            <TempleArt size={cell} locked={!gateOpen} />
          </GridToken>
          {maze.keys
            .filter((k) => !got.includes(k))
            .map((k) => (
              <GridToken key={k} index={k} cols={n} cell={cell} size={cell * 0.8}>
                <ItemIcon name="gem" size={cell * 0.8} />
              </GridToken>
            ))}
          <FootprintLayer steps={hint} cols={n} rows={n} cell={cell} />
          <GridToken index={pos} cols={n} cell={cell} size={cell * 0.86} duration={STEP_MS} bump={bump.n} bumpDir={bump.dir} zIndex={5}>
            <ExplorerToken size={cell * 0.86} />
          </GridToken>
        </BoardFrame>
      </SwipeArea>
      <DPad onDir={move} size={btn} disabled={paused} />
    </View>
  );
}
