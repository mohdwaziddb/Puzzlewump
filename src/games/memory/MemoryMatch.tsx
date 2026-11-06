import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { ItemIcon } from '@/art/items';
import { Board, FlipTile, useHintEffect, usePuzzle, useTimers } from '@/games/shared';
import { generateMatch, isCarelessMismatch, isPair, type MatchParams } from './generators';
import { MemorizeSlot, MEMO_SLOT_H, usePausableTimeout } from './memoryKit';

export default function MemoryMatch(props: PuzzleProps<MatchParams>) {
  const { params, seed, width, height, paused } = props;
  const pz = usePuzzle(seed, (rng) => generateMatch(params, rng), [params.pairs, params.cols, params.peekMs]);
  const { later } = useTimers();

  const [peeking, setPeeking] = useState(pz.peekMs > 0);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [hinted, setHinted] = useState<number[]>([]);
  const seen = useRef(new Set<number>());
  const busy = useRef(false);
  const solved = useRef(false);

  const peekLeft = usePausableTimeout({
    active: peeking,
    paused,
    ms: pz.peekMs || 1,
    resetKey: 'peek',
    onDone: () => setPeeking(false),
  });

  const flip = useCallback(
    (i: number) => {
      if (busy.current || peeking || matched.has(i) || open.includes(i) || solved.current) return;
      if (open.length === 0) {
        setOpen([i]);
        return;
      }
      const first = open[0];
      const pair = [first, i];
      setOpen(pair);
      if (isPair(pz.cards, first, i)) {
        const nm = new Set(matched).add(first).add(i);
        setMatched(nm);
        setOpen([]);
        setHinted((h) => h.filter((x) => x !== first && x !== i));
        props.onProgress?.(nm.size / pz.cards.length);
        if (nm.size === pz.cards.length) {
          solved.current = true;
          later(() => props.onSolved(), 500);
        } else props.onCorrect?.();
      } else {
        if (isCarelessMismatch(pz.cards, seen.current, first, i)) props.onMistake();
        busy.current = true;
        later(() => {
          busy.current = false;
          setOpen([]);
        }, 900);
      }
      seen.current.add(first);
      seen.current.add(i);
    },
    [open, matched, peeking, pz.cards, props, later],
  );

  useHintEffect(props.hintSignal, () => {
    // briefly reveal one unmatched pair (prefer one involving the currently open card)
    const start = open.length === 1 ? open[0] : pz.cards.findIndex((_, i) => !matched.has(i));
    if (start < 0) return;
    const partner = pz.cards.findIndex((c, j) => j !== start && c === pz.cards[start]);
    const pair = [start, partner];
    setHinted(pair);
    later(() => setHinted([]), 1500);
  });

  const boardH = height - (pz.peekMs > 0 ? MEMO_SLOT_H : 0);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {pz.peekMs > 0 && <MemorizeSlot running={peeking && !paused} durationMs={peekLeft} label="Peek!" />}
      <Board
        rows={pz.rows}
        cols={pz.cols}
        width={width}
        height={boardH}
        gap={8}
        maxCell={110}
        renderCell={(idx, _r, _c, size) =>
          idx < pz.cards.length ? (
            <FlipTile
              size={size}
              faceUp={peeking || matched.has(idx) || open.includes(idx) || hinted.includes(idx)}
              matched={matched.has(idx)}
              hinted={hinted.includes(idx)}
              onPress={() => flip(idx)}
            >
              <ItemIcon name={pz.cards[idx]} size={size * 0.72} />
            </FlipTile>
          ) : null
        }
      />
    </View>
  );
}
