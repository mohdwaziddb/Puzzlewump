/** missing-number: "3 + ? = 7" with the gap in any position. Hint shows the undo-sum ("7 - 3"). */
import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { QuestionCard, usePuzzle } from '@/games/shared';
import { eqText, genMissing, type MissingParams, type MissingQ } from './generators';
import { AnswerSlot, MathRounds, SPACE, fitFont, type RoundCtx } from './MathKit';

function MissingCard({ q, ctx }: { q: MissingQ; ctx: RoundCtx }) {
  const fs = fitFont(q.parts.join(' ') + '00', ctx.width - 50, 46);
  return (
    <QuestionCard width={ctx.width}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {q.parts.map((p, i) =>
          p === '?' ? (
            <AnswerSlot key={i} text={ctx.solved ? String(q.answer) : '?'} size={fs * 0.8} solved={ctx.solved} />
          ) : (
            <GameText key={i} size={fs} weight="black" color={colors.ink}>
              {p}
            </GameText>
          ),
        )}
      </View>
      {ctx.hintLevel > 0 && !ctx.solved && (
        <View style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, backgroundColor: SPACE.slotLight }}>
          <GameText size={20} weight="black" color={SPACE.slot}>
            {`Try ${eqText(q.helper)}`}
          </GameText>
        </View>
      )}
    </QuestionCard>
  );
}

export default function MissingNumber(props: PuzzleProps<MissingParams>) {
  const { params, seed } = props;
  const questions = usePuzzle(seed, (rng) => genMissing(rng, params), [JSON.stringify(params)]);
  return <MathRounds puzzle={props} questions={questions} renderQuestion={(q, ctx) => <MissingCard q={q} ctx={ctx} />} />;
}
