/**
 * compare-numbers: pick < = > between two numbers/expressions/groups,
 * or "tap the biggest / smallest". Hint reveals the value of every expression (or counts the groups).
 */
import React from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { QuestionCard, usePuzzle } from '@/games/shared';
import { genCompare, type CompareParams, type CompareQ, type Side, type VisualItem } from './generators';
import { AnswerSlot, ItemGroup, MathRounds, SPACE, fitFont, type RoundCtx } from './MathKit';

const SIGN_WORD: Record<string, string> = { '<': 'smaller', '=': 'same', '>': 'bigger' };

/** One side: a group of items, a number or an expression (+ its value when hinted). */
function SideView({
  side,
  item,
  width,
  height,
  hint,
  color = colors.ink,
}: {
  side: Side;
  item?: VisualItem;
  width: number;
  height: number;
  hint: boolean;
  color?: string;
}) {
  if (item) return <ItemGroup item={item} count={side.value} width={width} height={height} numbers={hint} />;
  const isExpr = side.label !== String(side.value);
  const fs = fitFont(side.label, width, Math.min(44, height * 0.55));
  return (
    <View style={{ width, alignItems: 'center' }}>
      <GameText size={fs} weight="black" color={color} outline={color === '#fff'}>
        {side.label}
      </GameText>
      {hint && isExpr && (
        <GameText size={Math.max(14, fs * 0.55)} weight="black" color={color === '#fff' ? colors.gold : SPACE.slot}>
          {`= ${side.value}`}
        </GameText>
      )}
    </View>
  );
}

function CompareCard({ q, ctx }: { q: CompareQ; ctx: RoundCtx }) {
  const inner = ctx.width - 50;
  const hint = ctx.hintLevel > 0 || ctx.solved;
  if (q.kind === 'compare-pick') {
    const word = q.visual ? (q.target === 'biggest' ? 'MOST' : 'FEWEST') : q.target === 'biggest' ? 'BIGGEST' : 'SMALLEST';
    return (
      <QuestionCard width={ctx.width}>
        <GameText size={26} weight="black" color={colors.ink} align="center">
          {q.visual ? 'Tap the group with the' : 'Tap the'}
        </GameText>
        <GameText size={38} weight="black" color={q.target === 'biggest' ? colors.orangeDeep : colors.blueDeep} align="center">
          {word}
        </GameText>
      </QuestionCard>
    );
  }
  const slot = 54;
  const sideW = (inner - slot - 16) / 2;
  const sideH = Math.max(60, Math.min(170, ctx.height - 60));
  return (
    <QuestionCard width={ctx.width}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SideView side={q.left} item={q.visual?.item} width={sideW} height={sideH} hint={hint} />
        <AnswerSlot text={ctx.solved ? q.answer : '?'} size={36} solved={ctx.solved} />
        <SideView side={q.right} item={q.visual?.item} width={sideW} height={sideH} hint={hint} />
      </View>
    </QuestionCard>
  );
}

export default function CompareNumbers(props: PuzzleProps<CompareParams>) {
  const { params, seed } = props;
  const questions = usePuzzle(seed, (rng) => genCompare(rng, params), [JSON.stringify(params)]);
  return (
    <MathRounds
      puzzle={props}
      questions={questions}
      layout={(q) =>
        q.kind === 'compare-sign'
          ? { columns: 3, answerShare: 0.3 }
          : q.visual
            ? { columns: 1, answerShare: 0.66 }
            : { columns: q.choices.length === 4 ? 2 : 3, answerShare: 0.4 }
      }
      renderQuestion={(q, ctx) => <CompareCard q={q} ctx={ctx} />}
      renderChoice={(q, value, w, h, ctx) => {
        if (q.kind === 'compare-sign') {
          return (
            <View style={{ alignItems: 'center' }}>
              <GameText size={Math.min(40, h * 0.55)} weight="black" color="#fff" outline>
                {value}
              </GameText>
              <GameText size={14} weight="black" color="#fff" outline>
                {SIGN_WORD[value]}
              </GameText>
            </View>
          );
        }
        const side = q.options.find((o) => o.value === value)!;
        return <SideView side={side} item={q.visual?.item} width={w} height={h} hint={ctx.hintLevel > 0} color="#fff" />;
      }}
    />
  );
}
