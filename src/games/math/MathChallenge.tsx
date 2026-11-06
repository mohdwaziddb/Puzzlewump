/** math-challenge: + - × ÷ questions, answered with choices (or the number pad at expert). */
import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { QuestionCard, usePuzzle } from '@/games/shared';
import { eqText, genArith, type ArithParams, type ArithQ } from './generators';
import { AnswerSlot, ItemGroup, MathRounds, fitFont, type RoundCtx } from './MathKit';

export function EquationRow({ text, answer, ctx, maxFont = 46 }: { text: string; answer: string; ctx: RoundCtx; maxFont?: number }) {
  const fs = fitFont(`${text} ${answer}00`, ctx.width - 50, maxFont);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <GameText size={fs} weight="black" color={colors.ink}>
        {text}
      </GameText>
      <AnswerSlot text={ctx.solved ? answer : '?'} size={fs * 0.8} solved={ctx.solved} />
    </View>
  );
}

function ArithCard({ q, ctx }: { q: ArithQ; ctx: RoundCtx }) {
  const row = <EquationRow text={`${eqText(q.eq)} =`} answer={String(q.answer)} ctx={ctx} />;
  if (!q.visual) return <QuestionCard width={ctx.width}>{row}</QuestionCard>;
  const inner = ctx.width - 50;
  const visH = Math.max(50, Math.min(170, ctx.height - 130));
  const numbers = ctx.hintLevel > 0;
  const { a, b, op } = q.eq;
  return (
    <QuestionCard width={ctx.width}>
      {op === '+' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ItemGroup item={q.visual.item} count={a} width={(inner - 30) / 2} height={visH} numbers={numbers} />
          <GameText size={32} weight="black" color={colors.purpleDeep} style={{ width: 30, textAlign: 'center' }}>
            +
          </GameText>
          <ItemGroup item={q.visual.item} count={b} width={(inner - 30) / 2} height={visH} numbers={numbers} numberFrom={a + 1} />
        </View>
      ) : (
        <ItemGroup item={q.visual.item} count={a} width={inner} height={visH} crossFrom={a - b} numbers={numbers} />
      )}
      <View style={{ height: 8 }} />
      {row}
    </QuestionCard>
  );
}

export default function MathChallenge(props: PuzzleProps<ArithParams>) {
  const { params, seed } = props;
  const questions = usePuzzle(seed, (rng) => genArith(rng, params), [JSON.stringify(params)]);
  return (
    <MathRounds
      puzzle={props}
      questions={questions}
      input={params.input ?? 'choice'}
      renderQuestion={(q, ctx) => <ArithCard q={q} ctx={ctx} />}
    />
  );
}
