import React, { useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ItemIcon } from '@/art/items';
import { GameText } from '@/components/ui';
import { Board, PopIn, Tile, useHintEffect, usePuzzle, useTimers, type TileState } from '@/games/shared';
import { generatePosition, isAskedCell, isItemCell, itemAt, type PositionParams } from './generators';
import { MemorizeSlot, MEMO_SLOT_H, usePausableTimeout } from './memoryKit';

/** Soft garden-hedge colour for empty cells. */
const HEDGE = { top: '#D8F5C4', bottom: '#A9DE8A', edge: '#5E9E3E' };
const ASK_H = 64;

export default function PositionMemory(props: PuzzleProps<PositionParams>) {
  const { params, seed, width, height, paused } = props;
  const pz = usePuzzle(seed, (rng) => generatePosition(params, rng), [
    params.rows,
    params.cols,
    params.count,
    params.showMs,
    params.mode,
    params.asks,
  ]);
  const { later } = useTimers();

  const [showing, setShowing] = useState(true);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [ask, setAsk] = useState(0);
  const [done, setDone] = useState(false);

  const left = usePausableTimeout({
    active: showing,
    paused,
    ms: pz.showMs,
    resetKey: 'show',
    onDone: () => setShowing(false),
  });

  const goal = pz.mode === 'all' ? pz.placed.length : pz.asks.length;

  const tap = (cell: number) => {
    if (showing || done || found.has(cell)) return;
    const ok = pz.mode === 'all' ? isItemCell(pz, cell) : isAskedCell(pz, ask, cell);
    if (!ok) {
      props.onMistake();
      setWrongCell(cell);
      later(() => setWrongCell((w) => (w === cell ? null : w)), 600);
      return;
    }
    const nf = new Set(found).add(cell);
    setFound(nf);
    setHintCell(null);
    props.onProgress?.(nf.size / goal);
    if (nf.size >= goal) {
      setDone(true);
      later(() => props.onSolved(), 600);
      return;
    }
    props.onCorrect?.();
    if (pz.mode === 'which') setAsk((a) => a + 1);
  };

  useHintEffect(props.hintSignal, () => {
    if (showing || done) return;
    const cell =
      pz.mode === 'all' ? pz.placed.find((x) => !found.has(x.cell))?.cell : pz.placed[pz.asks[ask]]?.cell;
    if (cell === undefined) return;
    setHintCell(cell);
    later(() => setHintCell((h) => (h === cell ? null : h)), 1600);
  });

  const askItem = pz.mode === 'which' && !showing && !done ? pz.placed[pz.asks[ask]]?.item : undefined;
  const boardH = height - MEMO_SLOT_H - (pz.mode === 'which' ? ASK_H : 0);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <MemorizeSlot running={showing && !paused} durationMs={left} />
      {pz.mode === 'which' && (
        <View style={{ height: ASK_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {askItem ? (
            <PopIn k={ask}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <GameText size={22} weight="black" color="#fff" outline>
                  Where was
                </GameText>
                <Tile size={54}>
                  <ItemIcon name={askItem} size={42} />
                </Tile>
                <GameText size={22} weight="black" color="#fff" outline>
                  ?
                </GameText>
              </View>
            </PopIn>
          ) : null}
        </View>
      )}
      <Board
        rows={pz.rows}
        cols={pz.cols}
        width={width}
        height={boardH}
        gap={8}
        maxCell={100}
        renderCell={(cell, _r, _c, size) => {
          const item = itemAt(pz, cell);
          const visible = showing || found.has(cell);
          const state: TileState = found.has(cell)
            ? 'correct'
            : wrongCell === cell
              ? 'wrong'
              : hintCell === cell
                ? 'hint'
                : 'idle';
          return (
            <Tile size={size} state={state} palette={HEDGE} onPress={showing ? undefined : () => tap(cell)}>
              {visible && item ? (
                <PopIn k={`${cell}-${visible}`}>
                  <ItemIcon name={item} size={size * 0.72} />
                </PopIn>
              ) : null}
            </Tile>
          );
        }}
      />
    </View>
  );
}
