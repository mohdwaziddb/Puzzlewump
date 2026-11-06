import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { GameText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useHintEffect, usePuzzle, useTimers } from '@/games/shared';
import { genFindDifference, type FindDiffParams } from './generators';
import { nearestDistancePx } from './sceneModel';
import { Scene, type SceneRing, type SceneTap } from './Scene';
import { paramsKey, useGentleMistake, useSolveOnce } from './helpers';

const GAP = 10;
const COUNTER_H = 34;

export default function FindDifference(props: PuzzleProps<FindDiffParams>) {
  const { params, seed, width, height, paused, hintSignal } = props;
  const puzzle = usePuzzle(seed, (rng) => genFindDifference(rng, params), [paramsKey(params)]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [hintId, setHintId] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ x: number; y: number; n: number; side: 'left' | 'right' } | null>(null);
  const { later } = useTimers();
  const solve = useSolveOnce(() => props.onSolved());
  const mistake = useGentleMistake(props.onMistake);
  const total = puzzle.diffs.length;

  useEffect(() => {
    props.onProgress?.(found.size / total);
    if (found.size >= total) later(solve, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.size]);

  useHintEffect(hintSignal, () => {
    const d = puzzle.diffs.find((x) => !found.has(x.id));
    if (d) setHintId(d.id);
  });

  const onTap = useCallback(
    (t: SceneTap, side: 'left' | 'right') => {
      if (paused || found.size >= total) return;
      const scene = side === 'left' ? puzzle.left : puzzle.right;
      // nearest difference within a generous radius
      let best: { id: string; d: number } | null = null;
      for (const df of puzzle.diffs) {
        const d = Math.hypot(df.x * t.sceneW - t.px, df.y * t.sceneH - t.py);
        const r = Math.max(df.size * t.sceneW * 0.62, 26);
        if (d <= r && (!best || d < best.d)) best = { id: df.id, d };
      }
      if (best) {
        if (found.has(best.id)) return;
        const id = best.id;
        setFound((s) => new Set(s).add(id));
        if (hintId === id) setHintId(null);
        props.onCorrect?.();
        return;
      }
      // be gentle: only count taps on a same-looking object or far out in empty sand/sea
      const far = nearestDistancePx(scene.objects, t.px, t.py, t.sceneW, scene.aspect) > t.sceneW * 0.17;
      if (t.hit || far) {
        if (mistake()) {
          const n = Date.now();
          setMiss({ x: t.nx, y: t.ny, n, side });
          later(() => setMiss((m) => (m && m.n === n ? null : m)), 650);
        }
      }
    },
    [paused, found, total, puzzle, hintId, props, mistake, later],
  );

  const rings = useMemo(() => {
    const r: SceneRing[] = puzzle.diffs
      .filter((d) => found.has(d.id))
      .map((d) => ({ key: d.id, x: d.x, y: d.y, size: d.size, color: '#FF3B3B' }));
    const h = puzzle.diffs.find((d) => d.id === hintId && !found.has(d.id));
    if (h) r.push({ key: `hint-${h.id}`, x: h.x, y: h.y, size: h.size, color: '#FFD23F', pulse: true });
    return r;
  }, [puzzle.diffs, found, hintId]);
  const ringsFor = (side: 'left' | 'right'): SceneRing[] =>
    miss && miss.side === side ? [...rings, { key: `miss-${miss.n}`, x: miss.x, y: miss.y, size: 0.06, color: '#8A8A8A' }] : rings;

  const sceneMaxH = (height - COUNTER_H - GAP * 2) / 2;
  return (
    <View style={{ width, height, alignItems: 'center', gap: GAP }}>
      <View style={{ height: COUNTER_H, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {puzzle.diffs.map((d, i) => (
          <View
            key={d.id}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 3,
              borderColor: '#fff',
              backgroundColor: i < found.size ? colors.green : 'rgba(0,0,0,0.25)',
            }}
          />
        ))}
        <GameText size={18} weight="black" color="#fff" outline style={{ marginLeft: 6 }}>
          {`${found.size} / ${total}`}
        </GameText>
      </View>
      <Scene data={puzzle.left} maxWidth={width} maxHeight={sceneMaxH} onTap={(t) => onTap(t, 'left')} rings={ringsFor('left')} />
      <Scene
        data={puzzle.right}
        maxWidth={width}
        maxHeight={sceneMaxH}
        onTap={(t) => onTap(t, 'right')}
        rings={ringsFor('right')}
      />
    </View>
  );
}
