import React from 'react';
import type { PuzzleProps } from '@/types';
import { ChoiceGrid, PopIn } from '@/games/shared';
import { genOddRounds, type OddParams } from './generators';
import { LogicLayout, fitChoices, useLogicGame } from './LogicKit';

/** Tap the one that does not belong (colour, shape, size, fill, count or item category). */
export default function OddOneOutGame(props: PuzzleProps<OddParams>) {
  const { width, height } = props;
  // keep at least 3 on screen so the "same" group still makes sense
  const g = useLogicGame(props, (rng) => genOddRounds(rng, props.params), { minLeft: 3 });
  const fit = fitChoices(width, height - 16, g.data.options.length, 140);
  return (
    <LogicLayout
      height={height}
      bottom={
        <PopIn k={g.round}>
          <ChoiceGrid {...g.grid} columns={fit.columns} itemHeight={fit.itemHeight} width={fit.gridWidth} variant="cream" />
        </PopIn>
      }
    />
  );
}
