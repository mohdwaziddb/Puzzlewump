/**
 * 'push-puzzle' — small sokoban in a jungle temple room: push the stone blocks onto the glowing pads.
 * D-pad or swipe moves one step. Undo and Reset live beside the D-pad.
 * Mistakes are gentle: only an impossible push (stone against a wall/stone) counts, at most once per 2s.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { BackIcon, RetryIcon } from '@/art/ui';
import { AudioService } from '@/services/AudioService';
import { GameText, IconButton } from '@/components/ui';
import { PopIn, useHintEffect, usePuzzle, useTimers } from '@/games/shared';
import {
  applyMove,
  generatePushPuzzle,
  isPushSolved,
  solvePush,
  stepCell,
  walkTo,
  OPPOSITE,
  type Dir,
  type PushParams,
  type PushState,
} from './generators';
import { BoardFrame, FootprintLayer, GridToken, TileBoard, cellArrow, FRAME } from './kit/boards';
import { DPad, DPAD_HEIGHT, SwipeArea, useGentleMistake } from './kit/controls';
import { CrateArt, ExplorerToken, dirtTile, padTile, ruinTile } from './kit/art';

export default function PushPuzzleGame(props: PuzzleProps<PushParams>) {
  const { params, seed, onSolved, onMistake, onCorrect, onProgress, hintSignal, paused, width, height } = props;
  const puz = usePuzzle(seed, () => generatePushPuzzle(seed, params), [params.size, params.crates, params.scramble, params.rocks]);
  const [state, setState] = useState<PushState>(puz.start);
  const [history, setHistory] = useState<PushState[]>([]);
  const [bump, setBump] = useState<{ n: number; dir: Dir }>({ n: 0, dir: 'U' });
  const [hint, setHint] = useState<{ steps: { cell: number; dir: Dir }[]; push: { cell: number; dir: Dir } | null } | null>(null);
  const [stuckMsg, setStuckMsg] = useState(false);
  const solvedRef = useRef(false);
  const { later } = useTimers();
  const hideHint = useRef<(() => void) | null>(null);
  const gentle = useGentleMistake(onMistake, true);

  const onPads = state.crates.filter((c) => puz.pads.includes(c)).length;

  const isDead = useCallback(
    (s: PushState) =>
      s.crates.some((c) => {
        if (puz.pads.includes(c)) return false;
        const w = (d: Dir) => puz.wall[stepCell(c, d, puz.cols, puz.rows)];
        return (w('U') || w('D')) && (w('L') || w('R'));
      }),
    [puz],
  );

  const commit = useCallback(
    (next: PushState, prev: PushState) => {
      setHistory((h) => [...h.slice(-199), prev]);
      setState(next);
      setStuckMsg(isDead(next));
      const placed = next.crates.filter((c) => puz.pads.includes(c)).length;
      const before = prev.crates.filter((c) => puz.pads.includes(c)).length;
      if (placed > before) {
        AudioService.play('correct');
        onCorrect?.();
      }
      onProgress?.(placed / puz.pads.length);
      if (isPushSolved(puz, next) && !solvedRef.current) {
        solvedRef.current = true;
        later(() => onSolved(), 550);
      }
    },
    [puz, isDead, onCorrect, onProgress, onSolved, later],
  );

  const move = useCallback(
    (d: Dir) => {
      if (paused || solvedRef.current) return;
      const res = applyMove(puz, state, d);
      if (res.kind === 'blocked') {
        setBump((b) => ({ n: b.n + 1, dir: d }));
        const ahead = stepCell(state.player, d, puz.cols, puz.rows);
        if (state.crates.includes(ahead)) {
          AudioService.play('wrong');
          gentle();
        }
        return;
      }
      AudioService.play(res.kind === 'push' ? 'whoosh' : 'pop');
      if (hint) setHint(null);
      commit(res.state, state);
    },
    [paused, puz, state, gentle, commit, hint],
  );

  const undo = () => {
    if (!history.length || solvedRef.current) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(prev);
    setStuckMsg(isDead(prev));
    setHint(null);
    onProgress?.(prev.crates.filter((c) => puz.pads.includes(c)).length / puz.pads.length);
  };
  const reset = () => {
    if (solvedRef.current) return;
    setHistory([]);
    setState(puz.start);
    setStuckMsg(false);
    setHint(null);
    onProgress?.(puz.start.crates.filter((c) => puz.pads.includes(c)).length / puz.pads.length);
  };

  useHintEffect(hintSignal, () => {
    if (solvedRef.current) return;
    const sol = isDead(state) ? null : solvePush(puz, state, 60000);
    hideHint.current?.();
    if (!sol || !sol.length) {
      setStuckMsg(true);
      return;
    }
    const p = sol[0];
    const stand = stepCell(p.crate, OPPOSITE[p.dir], puz.cols, puz.rows);
    const walk = walkTo(puz, state, stand) ?? [];
    let cur = state.player;
    const steps = walk.slice(0, 6).map((d) => {
      cur = stepCell(cur, d, puz.cols, puz.rows);
      return { cell: cur, dir: d };
    });
    setHint({ steps, push: { cell: p.crate, dir: p.dir } });
    hideHint.current = later(() => setHint(null), 7000);
  });

  /* layout */
  const btn = Math.max(48, Math.min(62, Math.floor(height * 0.105)));
  const avail = height - DPAD_HEIGHT(btn) - 50;
  const cell = Math.floor(Math.min((width - FRAME * 2 - 6) / puz.cols, avail / puz.rows, 72));

  const version = `${seed}-${puz.cols}`;
  const paint = useCallback(
    (i: number, x: number, y: number, s: number, v: number) =>
      puz.wall[i] ? (
        ruinTile(i, x, y, s, v)
      ) : (
        <React.Fragment key={i}>
          {dirtTile(`d${i}`, x, y, s, v)}
          {puz.pads.includes(i) && padTile(`p${i}`, x, y, s)}
        </React.Fragment>
      ),
    [puz],
  );

  const pushArrow = useMemo(
    () => (hint?.push ? cellArrow('push', hint.push.cell, puz.cols, cell, hint.push.dir) : undefined),
    [hint, puz.cols, cell],
  );

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly' }}>
      <View style={{ height: 30, justifyContent: 'center' }}>
        {stuckMsg ? (
          <PopIn k="stuck">
            <GameText size={17} color="#fff" weight="black" outline>
              Stuck! Tap Undo or Reset
            </GameText>
          </PopIn>
        ) : (
          <GameText size={17} color="#fff" weight="black" outline>{`Stones on pads: ${onPads} / ${puz.pads.length}`}</GameText>
        )}
      </View>
      <SwipeArea onSwipe={move} enabled={!paused}>
        <BoardFrame width={cell * puz.cols} height={cell * puz.rows}>
          <TileBoard cols={puz.cols} rows={puz.rows} cell={cell} paint={paint} version={version} />
          {hint && <FootprintLayer steps={hint.steps} cols={puz.cols} rows={puz.rows} cell={cell} extra={pushArrow} />}
          {state.crates.map((c, k) => (
            <GridToken key={k} index={c} cols={puz.cols} cell={cell} size={cell * 0.9} duration={120}>
              <CrateArt size={cell * 0.9} onPad={puz.pads.includes(c)} />
            </GridToken>
          ))}
          <GridToken index={state.player} cols={puz.cols} cell={cell} size={cell * 0.84} duration={120} bump={bump.n} bumpDir={bump.dir} zIndex={5}>
            <ExplorerToken size={cell * 0.84} />
          </GridToken>
        </BoardFrame>
      </SwipeArea>
      <DPad
        onDir={move}
        size={btn}
        disabled={paused}
        left={
          <View style={{ alignItems: 'center', gap: 2 }}>
            <IconButton size={btn * 0.85} variant="blue" onPress={undo} disabled={!history.length || paused}>
              <BackIcon size={btn * 0.4} color="#fff" />
            </IconButton>
            <GameText size={13} color="#fff" weight="black" outline>
              Undo
            </GameText>
          </View>
        }
        right={
          <View style={{ alignItems: 'center', gap: 2 }}>
            <IconButton size={btn * 0.85} variant="orange" onPress={reset} disabled={!history.length || paused}>
              <RetryIcon size={btn * 0.4} color="#fff" />
            </IconButton>
            <GameText size={13} color="#fff" weight="black" outline>
              Reset
            </GameText>
          </View>
        }
      />
    </View>
  );
}
