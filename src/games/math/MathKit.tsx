/**
 * Number Planet kit: one generic round runner used by all 5 math mechanics, plus
 * counting visuals. Mechanics only describe how to draw a question.
 *
 *  - MathRounds   question area + answers (ChoiceGrid or NumberPad), hints, rounds, pause
 *  - ItemGroup    n ItemIcons laid out to fit a box (optional cross-out / counting labels)
 *  - RoundDots    "3 of 6" progress dots
 *  - fitFont      font size that fits a string into a width
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ItemIcon, type ItemName } from '@/art/items';
import {
  ChoiceGrid,
  NumberPad,
  PopIn,
  useHintEffect,
  useRounds,
  useShake,
  useTimers,
  type Choice,
} from '@/games/shared';
import type { BaseQ } from './generators';

export const SPACE = {
  slot: '#6A3FC4',
  slotLight: '#E9DDFF',
  planet: ['#7E57C2', '#4C8DFF', '#FF7EB6', '#26C6DA', '#FF8A3D', '#5DD43B', '#FFC93C'],
};

/** Font size so `text` fits in `width` (Fredoka digits are ~0.6em wide). */
export function fitFont(text: string, width: number, max = 44, min = 16): number {
  return Math.max(min, Math.min(max, Math.floor(width / (Math.max(1, text.length) * 0.6))));
}

/* ------------------------------------------------------------ ItemGroup */

export function ItemGroup({
  item,
  count,
  width,
  height,
  crossFrom,
  numbers,
  numberFrom = 1,
}: {
  item: ItemName;
  count: number;
  width: number;
  height: number;
  /** items at index >= crossFrom are crossed out (taken away) */
  crossFrom?: number;
  /** show 1,2,3... under each item (counting hint) */
  numbers?: boolean;
  /** first counting label (to keep counting across two groups) */
  numberFrom?: number;
}) {
  const gap = 3;
  const labelH = numbers ? 14 : 0;
  let best = { size: 0, cols: Math.max(1, count) };
  for (let rows = 1; rows <= Math.max(1, count); rows++) {
    const cols = Math.ceil(count / rows);
    const s = Math.min((width - gap * (cols - 1)) / cols, (height - gap * (rows - 1)) / rows - labelH);
    if (s > best.size) best = { size: s, cols };
  }
  const size = Math.max(10, Math.floor(Math.min(best.size, 56)));
  const rows: number[][] = [];
  for (let i = 0; i < count; i++) {
    if (i % best.cols === 0) rows.push([]);
    rows[rows.length - 1].push(i);
  }
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', gap }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap }}>
          {r.map((i) => {
            const crossed = crossFrom !== undefined && i >= crossFrom;
            return (
              <View key={i} style={{ width: size, alignItems: 'center' }}>
                <View style={{ width: size, height: size, opacity: crossed ? 0.35 : 1 }}>
                  <ItemIcon name={item} size={size} />
                </View>
                {crossed && (
                  <Svg width={size} height={size} style={{ position: 'absolute' }} viewBox="0 0 10 10">
                    <Line x1={1.5} y1={1.5} x2={8.5} y2={8.5} stroke={colors.redDeep} strokeWidth={1.4} strokeLinecap="round" />
                    <Line x1={8.5} y1={1.5} x2={1.5} y2={8.5} stroke={colors.redDeep} strokeWidth={1.4} strokeLinecap="round" />
                  </Svg>
                )}
                {numbers && (
                  <GameText size={12} weight="black" color={crossed ? colors.redDeep : SPACE.slot}>
                    {i + numberFrom}
                  </GameText>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------ RoundDots */

export function RoundDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', height: 18, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 16 : 12,
            height: i === current ? 16 : 12,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: i < current ? colors.gold : i === current ? '#9B6CF0' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </View>
  );
}

/** Rounded "?" slot that turns into the answer when solved. */
export function AnswerSlot({ text, size, solved }: { text: string; size: number; solved: boolean }) {
  return (
    <View
      style={{
        minWidth: size * 1.3,
        height: size * 1.35,
        paddingHorizontal: 6,
        borderRadius: size * 0.3,
        borderWidth: 3,
        borderColor: solved ? colors.greenDeep : SPACE.slot,
        backgroundColor: solved ? '#C9FFB0' : SPACE.slotLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GameText size={size} weight="black" color={solved ? colors.greenDeep : SPACE.slot}>
        {text}
      </GameText>
    </View>
  );
}

/* ------------------------------------------------------------ MathRounds */

export interface RoundCtx {
  /** box available to the question drawing */
  width: number;
  height: number;
  /** hints used this round */
  hintLevel: number;
  solved: boolean;
  /** reveal steps already shown (for step-by-step questions) */
  shown: number;
  round: number;
}

interface MathRoundsProps<Q extends BaseQ> {
  puzzle: PuzzleProps<any>;
  questions: Q[];
  input?: 'choice' | 'pad';
  /** answer grid layout per question (default 2 columns, 40% of the height) */
  layout?: (q: Q) => { columns?: number; answerShare?: number };
  renderQuestion: (q: Q, ctx: RoundCtx) => React.ReactNode;
  /** custom drawing for a choice value inside a w x h tile */
  renderChoice?: (q: Q, value: number | string, w: number, h: number, ctx: RoundCtx) => React.ReactNode;
  /** labels for choice values (default String(value)) */
  choiceLabel?: (q: Q, value: number | string) => string;
  /** step-by-step reveal before answering (mental chain) */
  revealSteps?: (q: Q) => number;
  revealMs?: number;
}

export function MathRounds<Q extends BaseQ>(props: MathRoundsProps<Q>) {
  const { puzzle, questions } = props;
  const rounds = useRounds(questions.length, {
    onSolved: () => puzzle.onSolved(),
    onProgress: puzzle.onProgress,
    delayMs: 650,
  });
  const q = questions[Math.min(rounds.round, questions.length - 1)];
  return (
    <View style={{ width: puzzle.width, height: puzzle.height, alignItems: 'center' }}>
      <RoundDots total={questions.length} current={rounds.round} />
      <RoundView key={rounds.round} {...props} q={q} round={rounds.round} onDone={rounds.next} />
    </View>
  );
}

const DOTS_H = 18;
const GAP = 12;

function RoundView<Q extends BaseQ>({
  puzzle,
  q,
  round,
  onDone,
  input = 'choice',
  layout,
  renderQuestion,
  renderChoice,
  choiceLabel,
  revealSteps,
  revealMs = 850,
}: MathRoundsProps<Q> & { q: Q; round: number; onDone: () => void }) {
  const { width, height, paused, hintSignal } = puzzle;
  const [hintLevel, setHintLevel] = useState(0);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [glow, setGlow] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [value, setValue] = useState('');
  const [shown, setShown] = useState(0);
  const { later } = useTimers();
  const { shake, shakeStyle } = useShake();
  const steps = revealSteps?.(q) ?? 0;
  const ready = shown >= steps;
  const correctKey = String(q.answer);

  // pause-aware step-by-step reveal
  useEffect(() => {
    if (paused || shown >= steps) return;
    return later(() => setShown((s) => s + 1), shown === 0 ? 500 : revealMs);
  }, [paused, shown, steps, revealMs, later]);

  useHintEffect(hintSignal, () => {
    if (solved) return;
    setHintLevel((h) => h + 1);
    setShown(steps);
    if (input === 'pad') {
      const digits = correctKey;
      const k = digits.startsWith(value) && value.length < digits.length ? value.length + 1 : 1;
      setValue(digits.slice(0, Math.min(digits.length, k)));
      return;
    }
    const wrongLeft = q.choices.map(String).filter((c) => c !== correctKey && !removed.has(c));
    if (wrongLeft.length >= 2) {
      const drop = wrongLeft.slice(0, wrongLeft.length >= 3 ? 2 : 1);
      setRemoved((s) => new Set([...s, ...drop]));
    } else setGlow(correctKey);
  });

  const right = () => {
    if (solved) return;
    setSolved(true);
    setGlow(null);
    puzzle.onCorrect?.();
    onDone();
  };
  const wrong = () => {
    if (input === 'pad') shake();
    puzzle.onMistake();
  };

  /* layout */
  const { columns = 2, answerShare = 0.4 } = layout?.(q) ?? {};
  const n = q.choices.length;
  const rows = Math.ceil(n / columns);
  let answersH: number;
  let itemH = 0;
  let padW = 0;
  if (input === 'pad') {
    const room = height - DOTS_H - GAP * 2 - 120;
    const h = Math.max(40, Math.min(56, (room - 108) / 4));
    padW = Math.min(width, 3 * (h / 0.7) + 16);
    answersH = 4 * Math.min(56, ((padW - 16) / 3) * 0.7) + 108;
  } else {
    const budget = height * answerShare;
    itemH = Math.max(44, Math.min(renderChoice ? 140 : 80, (budget - (rows - 1) * GAP) / rows - 4));
    answersH = rows * (itemH + 4) + (rows - 1) * GAP;
  }
  const qH = Math.max(90, height - DOTS_H - GAP * 2 - answersH);
  const ctx: RoundCtx = { width, height: qH, hintLevel, solved, shown, round };
  const tileW = (width - GAP * (columns - 1)) / columns;

  const choices: Choice[] = useMemo(
    () =>
      q.choices
        .filter((c) => !removed.has(String(c)))
        .map((c) => ({
          key: String(c),
          label: choiceLabel ? choiceLabel(q, c) : String(c),
          render: renderChoice ? () => renderChoice(q, c, tileW - 8, itemH - 8, ctx) : undefined,
        })),
    // ctx fields that matter for drawing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, removed, tileW, itemH, hintLevel, solved],
  );

  return (
    <View style={{ width, flex: 1, alignItems: 'center', marginTop: GAP }}>
      <Animated.View style={[{ width, height: qH, justifyContent: 'center' }, shakeStyle]}>
        <PopIn k={round}>{renderQuestion(q, ctx)}</PopIn>
      </Animated.View>
      <View style={{ marginTop: GAP, opacity: ready ? 1 : 0.55 }}>
        {input === 'pad' ? (
          <NumberPad
            value={solved ? correctKey : value}
            onChange={setValue}
            width={padW}
            maxLength={Math.max(3, correctKey.length + 1)}
            disabled={paused || solved || !ready}
            onSubmit={() => {
              if (Number(value) === Number(q.answer)) right();
              else {
                wrong();
                setValue('');
              }
            }}
          />
        ) : (
          <ChoiceGrid
            choices={choices}
            correctKey={correctKey}
            roundKey={round}
            columns={columns}
            width={width}
            itemHeight={itemH}
            hintKey={glow}
            variant="purple"
            disabled={paused || !ready}
            onCorrect={right}
            onWrong={wrong}
          />
        )}
      </View>
    </View>
  );
}
