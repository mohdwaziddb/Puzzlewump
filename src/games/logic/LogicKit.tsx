/**
 * Logic Galaxy kit: one hook + a few views shared by all four mechanics.
 * Every logic puzzle is "look at something, then pick from a ChoiceGrid" over N rounds.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import type { Rng } from '@/engine/rng';
import { ItemIcon } from '@/art/items';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ChoiceGrid, Tile, type Choice, type TileState, usePuzzle, useRounds, useHintEffect } from '@/games/shared';
import type { ChoiceRound, Option } from './generators';
import { Shape } from './Shape';

/** Deep-space tile palette for stimulus cells. */
export const SPACE_TILE = { top: '#FFFFFF', bottom: '#E9E2FF', edge: '#8E74E0' };
export const SLOT_TILE = { top: '#3A2580', bottom: '#24165E', edge: '#3DF5E0' };

export function OptionArt({ option, size }: { option: Option; size: number }) {
  if (option.item) return <ItemIcon name={option.item} size={size} />;
  if (option.shape) return <Shape shape={option.shape} size={size} />;
  return null;
}

/** Columns + tile height for n choices inside width x height. */
export function fitChoices(width: number, height: number, n: number, maxItem = 120) {
  const columns = n <= 3 ? n : n === 4 ? 2 : 3;
  const rows = Math.ceil(n / columns);
  const gap = 12;
  const colW = (width - gap * (columns - 1)) / columns;
  const itemHeight = Math.max(48, Math.floor(Math.min(maxItem, colW, (height - gap * (rows - 1)) / rows - 6)));
  const gridWidth = Math.min(width, columns * itemHeight * 1.25 + gap * (columns - 1));
  return { columns, itemHeight, gridWidth };
}

/**
 * Drives a multi-round choice puzzle: builds rounds from the seed, wires ChoiceGrid to the host
 * (onCorrect/onMistake/onProgress/onSolved), and turns hints into eliminations then a glow.
 * `hints` (per round) lets the stimulus highlight the rule too.
 */
export function useLogicGame<R extends ChoiceRound>(
  props: PuzzleProps<any>,
  build: (rng: Rng) => R[],
  opts: { minLeft?: number } = {},
) {
  const rounds = usePuzzle(props.seed, build, [JSON.stringify(props.params)]);
  const { round, next } = useRounds(rounds.length, { onSolved: () => props.onSolved(), onProgress: props.onProgress });
  const r = rounds[round];
  const [elim, setElim] = useState<string[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    setElim([]);
    setTried([]);
    setHints(0);
    setGlow(false);
  }, [round]);

  useHintEffect(props.hintSignal, () => {
    setHints((h) => h + 1);
    const left = r.options.filter((o) => !elim.includes(o.key) && !tried.includes(o.key));
    const wrong = left.filter((o) => o.key !== r.answerKey);
    if (wrong.length && left.length > (opts.minLeft ?? 2)) setElim((e) => [...e, wrong[0].key]);
    else setGlow(true);
  });

  const choices: Choice[] = useMemo(
    () =>
      r.options
        .filter((o) => !elim.includes(o.key))
        .map((o) => ({ key: o.key, render: (s: number) => <OptionArt option={o} size={s} /> })),
    [r, elim],
  );

  return {
    round,
    total: rounds.length,
    data: r,
    hints,
    grid: {
      choices,
      correctKey: r.answerKey,
      roundKey: round,
      hintKey: glow ? r.answerKey : null,
      disabled: props.paused,
      onCorrect: () => {
        props.onCorrect?.();
        next();
      },
      onWrong: (key: string) => {
        setTried((t) => [...t, key]);
        props.onMistake();
      },
    },
  };
}

/** A non-interactive stimulus cell: a shape on a light tile, or the glowing "?" slot. */
export function ShapeCell({
  option,
  size,
  slot,
  state = 'idle',
}: {
  option?: Option;
  size: number;
  slot?: boolean;
  state?: TileState;
}) {
  if (slot) {
    return (
      <Tile size={size} palette={SLOT_TILE} state={state === 'hint' ? 'hint' : 'idle'}>
        <GameText size={size * 0.55} weight="black" color="#3DF5E0">
          ?
        </GameText>
      </Tile>
    );
  }
  return (
    <Tile size={size} palette={SPACE_TILE} state={state}>
      {option && <OptionArt option={option} size={size * 0.8} />}
    </Tile>
  );
}

/** Small caption under a stimulus. */
export function Caption({ text }: { text: string }) {
  return (
    <GameText size={16} weight="bold" color={colors.inkSoft} align="center">
      {text}
    </GameText>
  );
}

/** Standard vertical layout: stimulus on top, choices below, both centred. */
export function LogicLayout({ top, bottom, height }: { top?: React.ReactNode; bottom: React.ReactNode; height: number }) {
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'space-evenly' }}>
      {top}
      {bottom}
    </View>
  );
}
