import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { PopIn, Tile, useHintEffect, usePuzzle, useRounds, useTimers, type TileState } from '@/games/shared';
import { genMatching, type MatchParams } from './generators';
import { ItemSprite } from './Scene';
import { paramsKey, useSolveOnce } from './helpers';

const GAP = 10;
type Sel = { side: 'item' | 'sil'; idx: number } | null;

export default function ObjectMatching(props: PuzzleProps<MatchParams>) {
  const { params, seed, width, height, paused, hintSignal } = props;
  const rounds = usePuzzle(seed, (rng) => genMatching(rng, params), [paramsKey(params)]);
  const solve = useSolveOnce(() => props.onSolved());
  const { round, next, total } = useRounds(rounds.length, { onSolved: solve, onProgress: props.onProgress, delayMs: 700 });
  const r = rounds[round];
  const { later } = useTimers();

  const [sel, setSel] = useState<Sel>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set()); // item indices
  const [wrong, setWrong] = useState<{ item: number; sil: number } | null>(null);
  const [hint, setHint] = useState<number | null>(null);

  useEffect(() => {
    setSel(null);
    setMatched(new Set());
    setWrong(null);
    setHint(null);
  }, [round]);

  const silFor = (itemIdx: number) => r.silhouettes.findIndex((s) => s.item === r.items[itemIdx]);
  const silMatched = (silIdx: number) => [...matched].some((i) => silFor(i) === silIdx);

  useHintEffect(hintSignal, () => {
    const i = r.items.findIndex((_, k) => !matched.has(k));
    if (i >= 0) setHint(i);
  });

  const check = (itemIdx: number, silIdx: number) => {
    setSel(null);
    if (r.silhouettes[silIdx].item === r.items[itemIdx]) {
      const m = new Set(matched).add(itemIdx);
      setMatched(m);
      if (hint === itemIdx) setHint(null);
      props.onCorrect?.();
      props.onProgress?.((round + m.size / r.items.length) / total);
      if (m.size === r.items.length) next();
    } else {
      props.onMistake();
      setWrong({ item: itemIdx, sil: silIdx });
      later(() => setWrong(null), 550);
    }
  };

  const tapItem = (i: number) => {
    if (paused || matched.has(i)) return;
    if (sel?.side === 'sil') check(i, sel.idx);
    else setSel({ side: 'item', idx: i });
  };
  const tapSil = (s: number) => {
    if (paused || silMatched(s)) return;
    if (sel?.side === 'item') check(sel.idx, s);
    else if (r.items.length === 1) check(0, s);
    else setSel({ side: 'sil', idx: s });
  };

  const nItems = r.items.length;
  const nSil = r.silhouettes.length;
  const silCols = Math.min(nSil, nSil > 6 ? 4 : nSil > 4 ? 3 : nSil);
  const silRows = Math.ceil(nSil / silCols);
  const labelH = 30;
  const maxByH = (height - labelH * 2 - GAP * 4) / (1 + silRows) - 12;
  const itemSize = Math.floor(Math.min(110, (width - GAP * (nItems - 1)) / nItems, maxByH));
  const silSize = Math.floor(Math.min(100, (width - GAP * (silCols - 1)) / silCols, maxByH));

  const itemState = (i: number): TileState =>
    matched.has(i) ? 'correct' : wrong?.item === i ? 'wrong' : sel?.side === 'item' && sel.idx === i ? 'selected' : hint === i ? 'hint' : 'idle';
  const silState = (s: number): TileState =>
    silMatched(s) ? 'correct' : wrong?.sil === s ? 'wrong' : sel?.side === 'sil' && sel.idx === s ? 'selected' : hint !== null && silFor(hint) === s ? 'hint' : 'idle';

  return (
    <PopIn k={round}>
      <View style={{ width, height, alignItems: 'center', gap: GAP }}>
        <GameText size={18} weight="black" color="#fff" outline>
          {nItems === 1 ? 'Which shadow is it?' : 'Tap a treasure, then its shadow'}
        </GameText>
        <View style={{ flexDirection: 'row', gap: GAP, justifyContent: 'center' }}>
          {r.items.map((it, i) => (
            <Tile key={`${it}-${i}`} size={itemSize} state={itemState(i)} onPress={() => tapItem(i)}>
              <ItemSprite item={it} size={itemSize * 0.76} />
            </Tile>
          ))}
        </View>
        <GameText size={16} weight="black" color="#fff" outline>
          {`Shadows  ${round + 1}/${total}`}
        </GameText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'center', width: silCols * silSize + (silCols - 1) * GAP }}>
          {r.silhouettes.map((s, k) => {
            const done = silMatched(k);
            return (
              <Tile
                key={`${s.item}-${k}`}
                size={silSize}
                state={silState(k)}
                onPress={() => tapSil(k)}
                palette={{ top: '#FFF4DC', bottom: '#F2DDB0', edge: '#B98A4A' }}
              >
                <ItemSprite item={s.item} size={silSize * 0.76} rotation={done ? 0 : s.rotation} flip={done ? false : s.flip} silhouette={!done} />
              </Tile>
            );
          })}
        </View>
      </View>
    </PopIn>
  );
}
