import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { AudioService } from '@/services/AudioService';
import { Tile, cellSize, useHintEffect, usePuzzle, useRounds, useTimers, type TileState } from '@/games/shared';
import { checkSequenceInput, generateSequence, sequenceForRound, type SequenceParams } from './generators';
import { usePausableTimeout } from './memoryKit';

/** Pad colours: dim (waiting) and lit (glowing) versions + a shape so colour is never the only cue. */
const PADS = [
  { dim: { top: '#E86A6F', bottom: '#B8333B', edge: '#7E1A20' }, lit: { top: '#FFE1E2', bottom: '#FF6B72', edge: '#C9313A' }, shape: 'heart' },
  { dim: { top: '#5FA8F0', bottom: '#2C6CC4', edge: '#17407E' }, lit: { top: '#E2F2FF', bottom: '#5BB8FF', edge: '#1F6FD1' }, shape: 'drop' },
  { dim: { top: '#F2C445', bottom: '#C99212', edge: '#80590A' }, lit: { top: '#FFF8D0', bottom: '#FFD84A', edge: '#E0A400' }, shape: 'star' },
  { dim: { top: '#6CD24C', bottom: '#3A962A', edge: '#1F5E15' }, lit: { top: '#E8FFDC', bottom: '#7CEB55', edge: '#2E9C17' }, shape: 'leaf' },
  { dim: { top: '#B48AF0', bottom: '#7A4CCB', edge: '#4B2690' }, lit: { top: '#F3EAFF', bottom: '#C6A3FF', edge: '#6A3FC4' }, shape: 'diamond' },
  { dim: { top: '#FF9F5A', bottom: '#D2661E', edge: '#8A3D0B' }, lit: { top: '#FFEBDB', bottom: '#FFAA66', edge: '#D9601A' }, shape: 'circle' },
] as const;

function PadShape({ shape, size, lit }: { shape: string; size: number; lit: boolean }) {
  const fill = lit ? '#FFFFFF' : 'rgba(255,255,255,0.55)';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {shape === 'heart' && <Path d="M50 85 C20 62 10 45 18 30 C26 15 44 17 50 32 C56 17 74 15 82 30 C90 45 80 62 50 85 Z" fill={fill} />}
      {shape === 'drop' && <Path d="M50 12 C66 36 78 50 78 64 A28 28 0 0 1 22 64 C22 50 34 36 50 12 Z" fill={fill} />}
      {shape === 'star' && <Polygon points="50,10 61,38 91,39 67,57 76,87 50,70 24,87 33,57 9,39 39,38" fill={fill} />}
      {shape === 'leaf' && <Path d="M18 82 C18 40 45 18 84 16 C84 56 60 82 18 82 Z" fill={fill} />}
      {shape === 'diamond' && <Polygon points="50,10 86,50 50,90 14,50" fill={fill} />}
      {shape === 'circle' && <Circle cx={50} cy={50} r={34} fill={fill} />}
    </Svg>
  );
}

type Phase = 'play' | 'input' | 'wait';

export default function SequenceMemory(props: PuzzleProps<SequenceParams>) {
  const { params, seed, width, height, paused } = props;
  const pz = usePuzzle(seed, (rng) => generateSequence(params, rng), [params.pads, params.startLength, params.rounds, params.stepMs]);
  const { round, next } = useRounds(pz.rounds, { onSolved: () => props.onSolved(), onProgress: props.onProgress, delayMs: 700 });
  const { later } = useTimers();
  const target = sequenceForRound(pz, round);

  const [phase, setPhase] = useState<Phase>('play');
  const [step, setStep] = useState(0); // play-phase step: 0 = lead-in, odd = pad lit, even = gap
  const [playId, setPlayId] = useState(0);
  const [input, setInput] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ pad: number; state: TileState } | null>(null);

  const replay = useCallback(() => {
    setInput([]);
    setStep(0);
    setPlayId((p) => p + 1);
    setPhase('play');
  }, []);

  // new round -> play the (longer) sequence
  useEffect(() => {
    replay();
  }, [round, replay]);

  const lastStep = target.length * 2;
  const litPad = phase === 'play' && step % 2 === 1 ? target[(step - 1) / 2] : null;

  usePausableTimeout({
    active: phase === 'play',
    paused,
    ms: step === 0 ? 700 : step % 2 === 1 ? pz.stepMs : Math.round(pz.stepMs * 0.45),
    resetKey: `${playId}-${step}`,
    onDone: () => {
      if (step >= lastStep) setPhase('input');
      else setStep((s) => s + 1);
    },
  });

  useEffect(() => {
    if (litPad !== null) AudioService.play('pop');
  }, [litPad, step]);

  const tap = (pad: number) => {
    if (phase !== 'input') return;
    AudioService.play('pop');
    const ni = [...input, pad];
    const res = checkSequenceInput(target, ni);
    if (res === 'wrong') {
      props.onMistake();
      setFlash({ pad, state: 'wrong' });
      setPhase('wait');
      later(() => {
        setFlash(null);
        replay();
      }, 1100);
      return;
    }
    setInput(ni);
    setFlash({ pad, state: 'selected' });
    later(() => setFlash((f) => (f && f.pad === pad ? null : f)), 260);
    if (res === 'done') {
      setPhase('wait');
      setFlash({ pad, state: 'correct' });
      later(() => setFlash(null), 500);
      if (round < pz.rounds - 1) props.onCorrect?.();
      next();
    }
  };

  useHintEffect(props.hintSignal, () => {
    if (phase !== 'wait') replay();
  });

  // layout: 3 pads -> 3 cols? use 2 cols for 4, 3 cols for 3/5/6
  const cols = pz.pads === 4 ? 2 : 3;
  const rows = Math.ceil(pz.pads / cols);
  const headerH = 44;
  const size = cellSize(width, height - headerH, rows, cols, 16, 130);
  const label =
    phase === 'play' ? 'Watch and listen...' : phase === 'input' ? `Your turn! ${input.length}/${target.length}` : ' ';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ height: headerH, justifyContent: 'center' }}>
        <GameText size={20} weight="black" color="#fff" outline>
          {label}
        </GameText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, width: cols * size + (cols - 1) * 16 }}>
        {Array.from({ length: pz.pads }, (_, i) => {
          const pad = PADS[i];
          const lit = litPad === i || (flash?.pad === i && flash.state === 'selected');
          const st: TileState = flash?.pad === i && flash.state !== 'selected' ? flash.state : 'idle';
          return (
            <Tile
              key={i}
              size={size}
              state={st}
              palette={lit ? pad.lit : pad.dim}
              onPress={phase === 'input' ? () => tap(i) : undefined}
              style={{ transform: [{ scale: lit ? 1.06 : 1 }] }}
            >
              <PadShape shape={pad.shape} size={size * 0.5} lit={lit} />
            </Tile>
          );
        })}
      </View>
    </View>
  );
}
