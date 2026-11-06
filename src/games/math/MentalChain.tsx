/**
 * mental-chain: a start number travels through operations shown one by one
 * (5 → +3 → ×2 → -4 = ?). Each hint reveals the next in-between result.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { PopIn, QuestionCard, usePuzzle } from '@/games/shared';
import { genChain, stepLabel, type ChainParams, type ChainQ } from './generators';
import { AnswerSlot, MathRounds, SPACE, fitFont, type RoundCtx } from './MathKit';

function Arrow({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M2 10 H15 M10 4 L16 10 L10 16" stroke={SPACE.slot} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Chip({ text, color, size, sub }: { text: string; color: string; size: number; sub?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          minWidth: size * 1.2,
          height: size,
          paddingHorizontal: 6,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: 'rgba(0,0,0,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GameText size={fitFont(text, size * 1.3, size * 0.5, 12)} weight="black" color="#fff" outline>
          {text}
        </GameText>
      </View>
      <View style={{ height: 20, justifyContent: 'center' }}>
        {sub ? (
          <GameText size={15} weight="black" color={SPACE.slot}>
            {sub}
          </GameText>
        ) : null}
      </View>
    </View>
  );
}

function ChainCard({ q, ctx }: { q: ChainQ; ctx: RoundCtx }) {
  const inner = ctx.width - 50;
  const items = q.steps.length + 2;
  // fit on one row when possible, otherwise wrap into two rows
  const perRow = inner / items > 62 ? items : Math.ceil(items / 2);
  const size = Math.max(36, Math.min(52, inner / perRow - 22));
  const arrow = 16;
  const all = ctx.shown >= q.steps.length;
  return (
    <QuestionCard width={ctx.width}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', rowGap: 4 }}>
        <Chip text={String(q.start)} color={SPACE.planet[1]} size={size} />
        {q.steps.map((s, i) => {
          const visible = i < ctx.shown;
          const sub = i < q.steps.length - 1 && (i < ctx.hintLevel || ctx.solved) ? `= ${q.values[i]}` : undefined;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', opacity: visible ? 1 : 0 }}>
              <View style={{ height: size, justifyContent: 'center', marginHorizontal: 2 }}>
                <Arrow size={arrow} />
              </View>
              {visible ? (
                <PopIn k={`s${i}`}>
                  <Chip text={stepLabel(s)} color={s.op === '+' ? colors.greenDeep : s.op === '-' ? colors.orangeDeep : SPACE.planet[0]} size={size} sub={sub} />
                </PopIn>
              ) : (
                <Chip text={stepLabel(s)} color="transparent" size={size} />
              )}
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'center', height: size, opacity: all ? 1 : 0, marginLeft: 6 }}>
          <GameText size={size * 0.6} weight="black" color={colors.ink}>
            =
          </GameText>
          <View style={{ width: 6 }} />
          <AnswerSlot text={ctx.solved ? String(q.answer) : '?'} size={size * 0.55} solved={ctx.solved} />
        </View>
      </View>
    </QuestionCard>
  );
}

export default function MentalChain(props: PuzzleProps<ChainParams>) {
  const { params, seed } = props;
  const questions = usePuzzle(seed, (rng) => genChain(rng, params), [JSON.stringify(params)]);
  return (
    <MathRounds
      puzzle={props}
      questions={questions}
      input={params.input ?? 'choice'}
      revealSteps={(q) => q.steps.length}
      renderQuestion={(q, ctx) => <ChainCard q={q} ctx={ctx} />}
    />
  );
}
