import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { PuzzleProps } from '@/types';
import { GameText, Parchment } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ChestArt, CoinIcon } from '@/art/ui';
import { Board, ChoiceGrid, PopIn, Tile, useHintEffect, usePuzzle, useTimers, type TileState } from '@/games/shared';
import { genTreasureHunt, type HuntParams, type HuntStep } from './generators';
import { ItemSprite } from './Scene';
import { paramsKey, useSolveOnce } from './helpers';

const GAP = 10;
const MAP_H = 44;
const CLUE_H = 56;
const PATH_COLORS = ['#C0392B', '#2471A3', '#7D3C98', '#1E8449'];
const STEP_LABEL: Record<HuntStep['kind'], string> = { count: 'Coins', key: 'Key', path: 'Path', dig: 'Dig' };

/** Little treasure-map progress strip: step dots joined by a dashed trail, ending in a chest. */
function MapStrip({ steps, current, width }: { steps: HuntStep[]; current: number; width: number }) {
  const n = steps.length + 1;
  const w = Math.min(width, 340);
  const xs = Array.from({ length: n }, (_, i) => 22 + (i * (w - 44)) / (n - 1));
  return (
    <View style={{ width: w, height: MAP_H }}>
      <Svg width={w} height={MAP_H} style={{ position: 'absolute' }}>
        <Rect x={2} y={4} width={w - 4} height={MAP_H - 8} rx={12} fill="#F6E2B3" stroke="#B98A4A" strokeWidth={2} />
        <Line x1={xs[0]} y1={MAP_H / 2} x2={xs[n - 1]} y2={MAP_H / 2} stroke="#B98A4A" strokeWidth={3} strokeDasharray="6,6" />
        {xs.slice(0, -1).map((x, i) => (
          <Circle key={i} cx={x} cy={MAP_H / 2} r={11} fill={i < current ? colors.green : i === current ? colors.gold : '#FFFFFF'} stroke="#7A3F17" strokeWidth={2} />
        ))}
        <Path
          d={`M${xs[n - 1] - 8},${MAP_H / 2 - 8} L${xs[n - 1] + 8},${MAP_H / 2 + 8} M${xs[n - 1] + 8},${MAP_H / 2 - 8} L${xs[n - 1] - 8},${MAP_H / 2 + 8}`}
          stroke="#E53935"
          strokeWidth={4}
          strokeLinecap="round"
        />
      </Svg>
      {xs.slice(0, -1).map((x, i) => (
        <View key={i} style={{ position: 'absolute', left: x - 11, top: MAP_H / 2 - 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <GameText size={12} weight="black">
            {String(i + 1)}
          </GameText>
        </View>
      ))}
    </View>
  );
}

function Clue({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <Parchment style={{ width: Math.min(width, 360), minHeight: CLUE_H, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</View>
    </Parchment>
  );
}

export default function TreasureHunt(props: PuzzleProps<HuntParams>) {
  const { params, seed, width, height, paused, hintSignal } = props;
  const puzzle = usePuzzle(seed, (rng) => genTreasureHunt(rng, params), [paramsKey(params)]);
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState(false);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [chestOpen, setChestOpen] = useState(false);
  const { later } = useTimers();
  const solve = useSolveOnce(() => props.onSolved());
  const total = puzzle.steps.length;
  const done = step >= total;
  const s = puzzle.steps[Math.min(step, total - 1)];

  useEffect(() => setHint(false), [step]);
  useEffect(() => {
    if (!done) return;
    later(() => setChestOpen(true), 500);
    later(solve, 1900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useHintEffect(hintSignal, () => setHint(true));

  const advance = () => {
    props.onCorrect?.();
    props.onProgress?.((step + 1) / total);
    later(() => setStep((x) => x + 1), 550);
  };
  const disabled = paused || done;
  const bodyH = height - MAP_H - CLUE_H - GAP * 3;
  const w = Math.min(width, 360);

  let clue: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (done) {
    clue = (
      <GameText size={22} weight="black">
        You found the treasure!
      </GameText>
    );
    const cs = Math.min(w * 0.7, bodyH * 0.9);
    body = (
      <View style={{ alignItems: 'center', justifyContent: 'center', height: bodyH }}>
        <PopIn k={chestOpen ? 'open' : 'closed'}>
          <ChestArt size={cs} open={chestOpen} />
        </PopIn>
        {chestOpen && (
          <View style={{ flexDirection: 'row', gap: 6, position: 'absolute', top: bodyH * 0.1 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <PopIn key={i} delay={i * 90} k={i}>
                <CoinIcon size={30} />
              </PopIn>
            ))}
          </View>
        )}
      </View>
    );
  } else if (s.kind === 'count') {
    clue = (
      <>
        <GameText size={20} weight="black">
          Count the gold coins!
        </GameText>
        <CoinIcon size={28} />
      </>
    );
    const boxH = Math.max(120, bodyH - 80);
    const boxW = Math.min(w, boxH * 2);
    const coinPx = Math.max(26, boxW * s.coinSize);
    body = (
      <View style={{ gap: GAP, alignItems: 'center' }}>
        <View style={{ width: boxW, height: boxW * 0.5, borderRadius: 18, backgroundColor: '#F4D58D', borderWidth: 3, borderColor: '#B98A4A' }}>
          {s.coins.map((c, i) => (
            <View key={i} style={{ position: 'absolute', left: c.x * boxW - coinPx / 2, top: c.y * boxW * 0.5 - coinPx / 2 }}>
              <CoinIcon size={coinPx} />
            </View>
          ))}
        </View>
        <ChoiceGrid
          choices={s.choices.map((c) => ({ key: String(c), label: c }))}
          correctKey={String(s.answer)}
          roundKey={`count-${step}`}
          columns={4}
          width={w}
          itemHeight={58}
          disabled={disabled}
          hintKey={hint ? String(s.answer) : null}
          onCorrect={advance}
          onWrong={() => props.onMistake()}
        />
      </View>
    );
  } else if (s.kind === 'key') {
    clue = (
      <>
        <GameText size={20} weight="black">
          Pick the key with
        </GameText>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 8 }}>
          <GameText size={22} weight="black">
            {String(s.answer)}
          </GameText>
          <CoinIcon size={22} />
        </View>
      </>
    );
    const cols = s.keys.length > 3 ? 2 : s.keys.length;
    const ih = Math.min(110, (bodyH - 20) / Math.ceil(s.keys.length / cols) - 16);
    body = (
      <ChoiceGrid
        choices={s.keys.map((k) => ({
          key: String(k),
          render: (size) => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ItemSprite item="key" size={size * 0.85} rotation={-30} />
              <View style={{ marginLeft: -size * 0.15, backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: colors.woodDeep, paddingHorizontal: 6 }}>
                <GameText size={Math.max(18, size * 0.32)} weight="black">
                  {String(k)}
                </GameText>
              </View>
            </View>
          ),
        }))}
        correctKey={String(s.answer)}
        roundKey={`key-${step}`}
        columns={cols}
        width={w}
        itemHeight={ih}
        disabled={disabled}
        hintKey={hint ? String(s.answer) : null}
        onCorrect={advance}
        onWrong={() => props.onMistake()}
      />
    );
  } else if (s.kind === 'path') {
    const n = s.perm.length;
    const correctStart = s.perm.indexOf(s.target);
    clue = (
      <>
        <GameText size={20} weight="black">
          Which path goes to the
        </GameText>
        <ItemSprite item={s.landmarks[s.target]} size={36} />
        <GameText size={20} weight="black">
          ?
        </GameText>
      </>
    );
    const mapH = Math.max(140, bodyH - 80);
    const icon = Math.min(52, w / n - 10);
    const xs = Array.from({ length: n }, (_, i) => ((i + 0.5) * w) / n);
    const top = icon + 6;
    const bottom = mapH - 6;
    const mid = (top + bottom) / 2;
    body = (
      <View style={{ gap: GAP, alignItems: 'center' }}>
        <View style={{ width: w, height: mapH, borderRadius: 18, backgroundColor: '#F6E2B3', borderWidth: 3, borderColor: '#B98A4A', overflow: 'hidden' }}>
          <Svg width={w} height={mapH} style={{ position: 'absolute' }}>
            {s.perm.map((end, i) => {
              const m = xs[(i + 1) % n];
              const d = `M${xs[i]},${bottom} C${xs[i]},${mid + 30} ${m},${mid + 30} ${m},${mid} S${xs[end]},${top + 30} ${xs[end]},${top}`;
              const strong = hint && i === correctStart;
              return (
                <Path
                  key={i}
                  d={d}
                  stroke={PATH_COLORS[i % PATH_COLORS.length]}
                  strokeWidth={strong ? 9 : 5}
                  strokeDasharray={strong ? undefined : '10,7'}
                  strokeLinecap="round"
                  fill="none"
                  opacity={hint && !strong ? 0.35 : 1}
                />
              );
            })}
          </Svg>
          {s.landmarks.map((lm, i) => (
            <View
              key={lm}
              style={{
                position: 'absolute',
                left: xs[i] - icon / 2 - 3,
                top: 2,
                borderRadius: icon,
                borderWidth: 3,
                borderColor: i === s.target ? colors.gold : 'transparent',
              }}
            >
              <ItemSprite item={lm} size={icon} />
            </View>
          ))}
        </View>
        <ChoiceGrid
          choices={s.perm.map((_, i) => ({ key: String(i), label: String(i + 1) }))}
          correctKey={String(correctStart)}
          roundKey={`path-${step}`}
          columns={n}
          width={w}
          itemHeight={56}
          variant="orange"
          disabled={disabled}
          hintKey={hint ? String(correctStart) : null}
          onCorrect={advance}
          onWrong={() => props.onMistake()}
        />
      </View>
    );
  } else {
    // dig
    const mini = 18;
    clue = (
      <>
        <GameText size={20} weight="black">
          Dig at the X on the map!
        </GameText>
        <View style={{ width: mini * s.size + 4, padding: 2, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#B98A4A', borderRadius: 4 }}>
          {Array.from({ length: s.size * s.size }, (_, i) => (
            <View key={i} style={{ width: mini, height: mini, borderWidth: 1, borderColor: '#B98A4A', backgroundColor: '#FFF4DC', alignItems: 'center', justifyContent: 'center' }}>
              {i === s.cell ? (
                <GameText size={14} weight="black" color="#E53935">
                  X
                </GameText>
              ) : null}
            </View>
          ))}
        </View>
      </>
    );
    body = (
      <Board
        rows={s.size}
        cols={s.size}
        width={w}
        height={bodyH}
        maxCell={100}
        renderCell={(i, _r, _c, size) => {
          const st: TileState = wrongCell === i ? 'wrong' : hint && i === s.cell ? 'hint' : 'idle';
          return (
            <Tile
              size={size}
              state={st}
              palette={{ top: '#FBE3A8', bottom: '#EFC57A', edge: '#B98A4A' }}
              onPress={
                disabled
                  ? undefined
                  : () => {
                      if (i === s.cell) advance();
                      else {
                        props.onMistake();
                        setWrongCell(i);
                        later(() => setWrongCell((c) => (c === i ? null : c)), 500);
                      }
                    }
              }
            >
              <Svg width={size * 0.4} height={size * 0.4} viewBox="0 0 10 10">
                <Circle cx={3} cy={6} r={1} fill="#D9A95B" />
                <Circle cx={7} cy={4} r={0.8} fill="#D9A95B" />
              </Svg>
            </Tile>
          );
        }}
      />
    );
  }

  return (
    <View style={{ width, height, alignItems: 'center', gap: GAP }}>
      <MapStrip steps={puzzle.steps} current={step} width={width} />
      <Clue width={width}>{clue}</Clue>
      <PopIn k={done ? 'chest' : step}>
        <View style={{ width, alignItems: 'center' }}>{body}</View>
      </PopIn>
      {!done && (
        <GameText size={13} color="#fff" weight="black" outline>
          {`Step ${step + 1} of ${total}: ${STEP_LABEL[s.kind]}`}
        </GameText>
      )}
    </View>
  );
}
