/** number-sequence: "2, 4, 6, 8, ?" — planets in a row. Hint shows the jump between planets. */
import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { QuestionCard, usePuzzle } from '@/games/shared';
import { genSequence, type SeqParams, type SeqQ } from './generators';
import { MathRounds, SPACE, fitFont, type RoundCtx } from './MathKit';

function Planet({ text, size, color, slot, solved }: { text: string; size: number; color: string; slot?: boolean; solved?: boolean }) {
  const bg = slot ? (solved ? '#C9FFB0' : SPACE.slotLight) : color;
  const fg = slot ? (solved ? colors.greenDeep : SPACE.slot) : '#fff';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 3,
        borderColor: slot ? fg : 'rgba(0,0,0,0.18)',
        borderStyle: slot && !solved ? 'dashed' : 'solid',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GameText size={fitFont(text, size * 0.85, size * 0.5, 10)} weight="black" color={fg} outline={!slot}>
        {text}
      </GameText>
    </View>
  );
}

function SeqCard({ q, ctx }: { q: SeqQ; ctx: RoundCtx }) {
  const n = q.terms.length + 1;
  const gap = 6;
  const inner = ctx.width - 50;
  const size = Math.floor(Math.min(64, (inner - gap * (n - 1)) / n));
  const showGaps = ctx.hintLevel > 0 || ctx.solved;
  return (
    <QuestionCard width={ctx.width}>
      <View style={{ flexDirection: 'row', gap, justifyContent: 'center' }}>
        {[...q.terms, null].map((t, i) => (
          <View key={i} style={{ alignItems: 'center', width: size }}>
            <Planet
              text={t === null ? (ctx.solved ? String(q.answer) : '?') : String(t)}
              size={size}
              color={SPACE.planet[i % SPACE.planet.length]}
              slot={t === null}
              solved={ctx.solved}
            />
            <View style={{ height: 22, justifyContent: 'center' }}>
              {showGaps && i > 0 && (
                <GameText size={fitFont(q.gaps[i - 1], size, 16, 10)} weight="black" color={SPACE.slot}>
                  {q.gaps[i - 1]}
                </GameText>
              )}
            </View>
          </View>
        ))}
      </View>
    </QuestionCard>
  );
}

export default function NumberSequence(props: PuzzleProps<SeqParams>) {
  const { params, seed } = props;
  const questions = usePuzzle(seed, (rng) => genSequence(rng, params), [JSON.stringify(params)]);
  return <MathRounds puzzle={props} questions={questions} renderQuestion={(q, ctx) => <SeqCard q={q} ctx={ctx} />} />;
}
