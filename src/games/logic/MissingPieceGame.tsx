import React from 'react';
import type { PuzzleProps } from '@/types';
import { Board, ChoiceGrid, PopIn, QuestionCard } from '@/games/shared';
import { genMissingRounds, type MissingParams } from './generators';
import { LogicLayout, ShapeCell, fitChoices, useLogicGame } from './LogicKit';

/** 3x3 space matrix: rows and columns follow rules; find the missing piece. */
export default function MissingPieceGame(props: PuzzleProps<MissingParams>) {
  const { width, height } = props;
  const g = useLogicGame(props, (rng) => genMissingRounds(rng, props.params));
  const r = g.data;
  const stimH = height * 0.55;
  const mr = Math.floor(r.missingIndex / 3);
  const mc = r.missingIndex % 3;
  const boardW = Math.min(width - 52, stimH - 46);
  const fit = fitChoices(width, height - stimH - 20, r.options.length, 100);
  return (
    <LogicLayout
      height={height}
      top={
        <PopIn k={g.round}>
          <QuestionCard width={boardW + 46}>
            <Board
              rows={3}
              cols={3}
              width={boardW}
              height={boardW}
              gap={6}
              maxCell={100}
              renderCell={(i, row, col, s) => (
                <ShapeCell
                  size={s}
                  slot={i === r.missingIndex}
                  option={{ key: `m${i}`, shape: r.grid[i] }}
                  state={g.hints > 0 && (row === mr || col === mc) ? 'hint' : 'idle'}
                />
              )}
            />
          </QuestionCard>
        </PopIn>
      }
      bottom={<ChoiceGrid {...g.grid} columns={fit.columns} itemHeight={fit.itemHeight} width={fit.gridWidth} variant="cream" />}
    />
  );
}
