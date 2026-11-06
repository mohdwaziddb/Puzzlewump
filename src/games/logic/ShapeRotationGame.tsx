import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ChoiceGrid, PopIn, QuestionCard } from '@/games/shared';
import { genRotationRounds, type RotationParams } from './generators';
import { Caption, LogicLayout, ShapeCell, fitChoices, useLogicGame } from './LogicKit';

/** Pick the option that is the target shape turned around (mirror images are tricks!). */
export default function ShapeRotationGame(props: PuzzleProps<RotationParams>) {
  const { width, height } = props;
  const g = useLogicGame(props, (rng) => genRotationRounds(rng, props.params));
  const r = g.data;
  const stimH = height * 0.4;
  const cell = Math.floor(Math.min(150, stimH - 80));
  const fit = fitChoices(width, height - stimH - 24, r.options.length);
  return (
    <LogicLayout
      height={height}
      top={
        <PopIn k={g.round}>
          <QuestionCard width={Math.min(width, cell + 120)}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <ShapeCell size={cell} option={{ key: 'target', shape: r.target }} state={g.hints > 0 ? 'hint' : 'idle'} />
              <Caption text={g.hints > 0 ? 'Turn it, do not flip it!' : 'Turn me!'} />
            </View>
          </QuestionCard>
        </PopIn>
      }
      bottom={<ChoiceGrid {...g.grid} columns={fit.columns} itemHeight={fit.itemHeight} width={fit.gridWidth} variant="cream" />}
    />
  );
}
