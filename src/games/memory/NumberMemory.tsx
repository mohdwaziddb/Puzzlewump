import React, { useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { NumberPad, PopIn, QuestionCard, useHintEffect, usePuzzle, useRounds, useShake } from '@/games/shared';
import Animated from 'react-native-reanimated';
import { checkNumber, generateNumber, type NumberParams } from './generators';
import { MemorizeSlot, MEMO_SLOT_H, usePausableTimeout } from './memoryKit';

export default function NumberMemory(props: PuzzleProps<NumberParams>) {
  const { params, seed, width, height, paused } = props;
  const pz = usePuzzle(seed, (rng) => generateNumber(params, rng), [params.digits, params.showMs, params.rounds]);
  const { round, next } = useRounds(pz.numbers.length, { onSolved: () => props.onSolved(), onProgress: props.onProgress, delayMs: 600 });
  const { shake, shakeStyle } = useShake();

  const [showing, setShowing] = useState(true);
  const [showId, setShowId] = useState(0);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const [lastRound, setLastRound] = useState(round);
  if (lastRound !== round) {
    setLastRound(round);
    setShowing(true);
    setShowId((s) => s + 1);
    setValue('');
    setLocked(false);
  }

  const target = pz.numbers[round];
  const left = usePausableTimeout({
    active: showing,
    paused,
    ms: pz.showMs,
    resetKey: `${round}-${showId}`,
    onDone: () => setShowing(false),
  });

  const reshow = () => {
    setValue('');
    setShowing(true);
    setShowId((s) => s + 1);
  };

  const submit = () => {
    if (locked || showing) return;
    if (checkNumber(target, value)) {
      setLocked(true);
      if (round < pz.numbers.length - 1) props.onCorrect?.();
      next();
    } else {
      props.onMistake();
      shake();
      setValue('');
    }
  };

  // hint: flash the number again
  useHintEffect(props.hintSignal, () => {
    if (!showing && !locked) reshow();
  });

  const cardW = Math.min(width, 320);
  const cardH = 116;
  // NumberPad height = display(58) + gap(10) + 4 rows of (keyH + 4) + 3 gaps(8); keyH = min(56, keyW * 0.7)
  const padSpace = height - MEMO_SLOT_H - cardH - 20;
  const keyH = Math.max(40, Math.min(56, (padSpace - 68 - 24) / 4 - 4));
  const padW = Math.min(cardW, keyH >= 56 ? cardW : (keyH / 0.7) * 3 + 16);
  const padH = 68 + 4 * (keyH + 4) + 24;
  const fontSize = Math.min(64, Math.floor((cardW - 40) / ((2 * pz.digits - 1) * 0.62)));
  const spaced = target.split('').join(' ');
  const hidden = target.split('').map((_, i) => (i < value.length ? value[i] : '_')).join(' ');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <MemorizeSlot running={showing && !paused} durationMs={left} label="Remember the number!" />
      <Animated.View style={shakeStyle}>
        <QuestionCard width={cardW}>
          <PopIn k={`${round}-${showId}-${showing}`}>
            <GameText size={showing ? fontSize : Math.min(fontSize, 44)} weight="black" color={showing ? colors.purpleDeep : colors.ink}>
              {showing ? spaced : hidden}
            </GameText>
          </PopIn>
        </QuestionCard>
      </Animated.View>
      {showing ? (
        <View style={{ height: padH }} />
      ) : (
        <NumberPad value={value} onChange={setValue} onSubmit={submit} width={padW} maxLength={pz.digits} disabled={locked} />
      )}
    </View>
  );
}
