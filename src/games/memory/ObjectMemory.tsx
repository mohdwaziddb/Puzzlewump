import React, { useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ItemIcon, type ItemName } from '@/art/items';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { Board, ChoiceGrid, PopIn, Tile, useHintEffect, usePuzzle, useRounds, useTimers, type TileState } from '@/games/shared';
import { generateObject, isShownItem, type ObjectParams } from './generators';
import { MemorizeSlot, MEMO_SLOT_H, usePausableTimeout } from './memoryKit';

/** Pick a pleasant rows x cols for n items. */
export function gridFor(n: number): { rows: number; cols: number } {
  const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
  return { rows: Math.ceil(n / cols), cols };
}

function ItemBoard({
  items,
  width,
  height,
  stateOf,
  onPress,
}: {
  items: (ItemName | null)[];
  width: number;
  height: number;
  stateOf?: (i: number) => TileState;
  onPress?: (i: number) => void;
}) {
  const { rows, cols } = gridFor(items.length);
  return (
    <Board
      rows={rows}
      cols={cols}
      width={width}
      height={height}
      gap={10}
      maxCell={110}
      renderCell={(i, _r, _c, size) => {
        if (i >= items.length) return null;
        const it = items[i];
        return (
          <PopIn k={`${i}-${it}`} delay={i * 50}>
            <Tile size={size} state={stateOf?.(i) ?? 'idle'} onPress={onPress ? () => onPress(i) : undefined}>
              {it ? (
                <ItemIcon name={it} size={size * 0.72} />
              ) : (
                <GameText size={size * 0.5} weight="black" color={colors.purple}>
                  ?
                </GameText>
              )}
            </Tile>
          </PopIn>
        );
      }}
    />
  );
}

export default function ObjectMemory(props: PuzzleProps<ObjectParams>) {
  const { params, seed, width, height, paused } = props;
  const pz = usePuzzle(seed, (rng) => generateObject(params, rng), [
    params.mode,
    params.count,
    params.showMs,
    params.pool,
    params.rounds,
    params.shuffle,
  ]);
  const { later } = useTimers();
  const { round, next } = useRounds(pz.rounds.length, { onSolved: () => props.onSolved(), onProgress: props.onProgress, delayMs: 700 });

  const [showing, setShowing] = useState(true);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState<number | null>(null);
  const [lastRound, setLastRound] = useState(round);
  const [done, setDone] = useState(false);
  if (lastRound !== round) {
    setLastRound(round);
    setShowing(true);
    setHint(null);
  }

  const left = usePausableTimeout({
    active: showing,
    paused,
    ms: pz.showMs,
    resetKey: `show-${round}`,
    onDone: () => setShowing(false),
  });

  useHintEffect(props.hintSignal, () => {
    if (showing) return;
    if (pz.mode === 'missing') {
      setHint(1); // glow the right answer
      return;
    }
    const r0 = pz.rounds[0];
    const i = r0.pool.findIndex((it, k) => isShownItem(r0, it) && !found.has(k));
    if (i >= 0) {
      setHint(i);
      later(() => setHint((h) => (h === i ? null : h)), 1800);
    }
  });

  const avail = height - MEMO_SLOT_H;

  /* ---------------------------------------------------------- pick mode */
  if (pz.mode === 'pick') {
    const r = pz.rounds[0];
    const tapPick = (i: number) => {
      if (done || found.has(i) || wrong.has(i)) return;
      if (isShownItem(r, r.pool[i])) {
        const nf = new Set(found).add(i);
        setFound(nf);
        if (hint === i) setHint(null);
        props.onProgress?.(nf.size / r.shown.length);
        if (nf.size === r.shown.length) {
          setDone(true);
          later(() => props.onSolved(), 500);
        } else props.onCorrect?.();
      } else {
        setWrong((s) => new Set(s).add(i));
        props.onMistake();
      }
    };
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <MemorizeSlot running={showing && !paused} durationMs={left} />
        {showing ? (
          <ItemBoard items={r.shown} width={width} height={avail} />
        ) : (
          <>
            <ItemBoard
              items={r.pool}
              width={width}
              height={avail - 36}
              stateOf={(i) => (found.has(i) ? 'correct' : wrong.has(i) ? 'wrong' : hint === i ? 'hint' : 'idle')}
              onPress={tapPick}
            />
            <View style={{ height: 36, justifyContent: 'center' }}>
              <GameText size={18} weight="black" color="#fff" outline>
                {`Found ${found.size} of ${r.shown.length}`}
              </GameText>
            </View>
          </>
        )}
      </View>
    );
  }

  /* ------------------------------------------------------- missing mode */
  const r = pz.rounds[round];
  const choiceH = Math.min(84, Math.max(56, avail * 0.17));
  const choicesBlock = choiceH * 2 + 12 + 16;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <MemorizeSlot running={showing && !paused} durationMs={left} />
      {showing ? (
        <ItemBoard key={`s${round}`} items={r.shown} width={width} height={avail} />
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <ItemBoard key={`a${round}`} items={r.after} width={width} height={avail - choicesBlock} />
          <ChoiceGrid
            roundKey={round}
            width={Math.min(width, 340)}
            columns={2}
            itemHeight={choiceH}
            choices={r.choices.map((c) => ({ key: c, render: (s) => <ItemIcon name={c} size={s} /> }))}
            correctKey={r.missing}
            hintKey={hint !== null ? r.missing : null}
            onWrong={() => props.onMistake()}
            onCorrect={() => {
              if (round < pz.rounds.length - 1) props.onCorrect?.();
              next();
            }}
          />
        </View>
      )}
    </View>
  );
}
