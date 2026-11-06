import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ChoiceGrid, PopIn, QuestionCard } from '@/games/shared';
import { genPatternRounds, type PatternParams } from './generators';
import { LogicLayout, ShapeCell, fitChoices, useLogicGame } from './LogicKit';

/** "What comes next?" — a row of shapes following a repeating / growing / turning rule. */
export default function PatternGame(props: PuzzleProps<PatternParams>) {
  const { width, height } = props;
  const g = useLogicGame(props, (rng) => genPatternRounds(rng, props.params));
  const r = g.data;
  const n = r.seq.length;
  const rows = n > 6 ? 2 : 1;
  const perRow = Math.ceil(n / rows);
  const gap = 6;
  const stimH = height * 0.44;
  const innerW = width - 72;
  const cell = Math.floor(
    Math.min(84, (innerW - gap * (perRow - 1)) / perRow, (stimH - 50 - gap * (rows - 1)) / rows - 4),
  );
  const fit = fitChoices(width, height - stimH - 24, r.options.length);
  const showUnit = g.hints > 0;

  return (
    <LogicLayout
      height={height}
      top={
        <PopIn k={g.round}>
          <QuestionCard width={Math.min(width - 12, perRow * (cell + gap) + 60)}>
            <View style={{ gap }}>
              {Array.from({ length: rows }, (_, row) => (
                <View key={row} style={{ flexDirection: 'row', gap, justifyContent: 'center' }}>
                  {r.seq.slice(row * perRow, (row + 1) * perRow).map((s, j) => {
                    const i = row * perRow + j;
                    const slot = i === r.gapIndex;
                    return (
                      <ShapeCell
                        key={i}
                        size={cell}
                        slot={slot}
                        option={slot ? undefined : { key: `s${i}`, shape: s }}
                        state={(showUnit && i < r.unitLen && !slot) || (slot && showUnit) ? 'hint' : 'idle'}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </QuestionCard>
        </PopIn>
      }
      bottom={<ChoiceGrid {...g.grid} columns={fit.columns} itemHeight={fit.itemHeight} width={fit.gridWidth} variant="cream" />}
    />
  );
}
