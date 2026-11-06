import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameButton, GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ChoiceGrid, NumberPad, PopIn, QuestionCard, useHintEffect, usePuzzle, useRounds } from '@/games/shared';
import { genCounting, type CountParams } from './generators';
import { ItemSprite, Scene, type SceneBadge, type SceneRing, type SceneTap } from './Scene';
import { paramsKey, useSolveOnce } from './helpers';

const GAP = 10;
const Q_H = 74;

export default function VisualCounting(props: PuzzleProps<CountParams>) {
  const { params, seed, width, height, paused, hintSignal } = props;
  const rounds = usePuzzle(seed, (rng) => genCounting(rng, params), [paramsKey(params)]);
  const solve = useSolveOnce(() => props.onSolved());
  const { round, next, total } = useRounds(rounds.length, { onSolved: solve, onProgress: props.onProgress, delayMs: 650 });
  const r = rounds[round];
  const usePad = params.input === 'pad';

  const [marks, setMarks] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const [typed, setTyped] = useState('');
  const [answering, setAnswering] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setMarks([]);
    setHint(false);
    setTyped('');
    setAnswering(false);
    setLocked(false);
  }, [round]);

  useHintEffect(hintSignal, () => {
    setHint(true);
    setAnswering(false);
  });

  // tapping a target puts a little number on it to help counting (never a mistake)
  const onTap = (t: SceneTap) => {
    if (paused || locked || !t.hit || t.hit.item !== r.target) return;
    const id = t.hit.id;
    setMarks((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const byId = useMemo(() => new Map(r.scene.objects.map((o) => [o.id, o])), [r]);
  const badges: SceneBadge[] = marks.map((id, i) => {
    const o = byId.get(id)!;
    return { key: id, x: o.x, y: o.y, text: String(i + 1) };
  });
  const rings: SceneRing[] = hint
    ? r.scene.objects.filter((o) => o.item === r.target).map((o) => ({ key: `h${o.id}`, x: o.x, y: o.y, size: o.size, color: '#FFD23F', pulse: true }))
    : [];

  const good = () => {
    setLocked(true);
    props.onCorrect?.();
    next();
  };
  const bad = () => {
    props.onMistake();
  };

  const question = (
    <QuestionCard width={Math.min(width, 340)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: Q_H - 40 }}>
        <GameText size={26} weight="black">
          How many
        </GameText>
        <ItemSprite item={r.target} size={40} />
        <GameText size={26} weight="black">
          ?
        </GameText>
        <GameText size={14} color={colors.inkSoft}>
          {`${round + 1}/${total}`}
        </GameText>
      </View>
    </QuestionCard>
  );

  if (usePad && answering) {
    const padW = Math.min(width, 280);
    return (
      <View style={{ width, height, alignItems: 'center', gap: GAP }}>
        {question}
        <NumberPad
          width={padW}
          value={typed}
          maxLength={2}
          disabled={paused || locked}
          onChange={setTyped}
          onSubmit={() => {
            if (Number(typed) === r.answer) good();
            else {
              bad();
              setTyped('');
            }
          }}
        />
        <GameButton label="Look again" size="sm" variant="blue" onPress={() => setAnswering(false)} />
      </View>
    );
  }

  const answerH = usePad ? 50 : 70;
  return (
    <View style={{ width, height, alignItems: 'center', gap: GAP }}>
      {question}
      <PopIn k={round}>
        <Scene
          data={r.scene}
          maxWidth={width}
          maxHeight={height - Q_H - answerH - GAP * 3 - 20}
          onTap={onTap}
          badges={badges}
          rings={rings}
        />
      </PopIn>
      {usePad ? (
        <GameButton label="I counted them!" variant="green" size="sm" onPress={() => setAnswering(true)} disabled={paused || locked} />
      ) : (
        <ChoiceGrid
          choices={r.choices.map((c) => ({ key: String(c), label: c }))}
          correctKey={String(r.answer)}
          roundKey={round}
          columns={4}
          width={Math.min(width, 360)}
          itemHeight={58}
          disabled={paused}
          onCorrect={good}
          onWrong={bad}
        />
      )}
    </View>
  );
}
