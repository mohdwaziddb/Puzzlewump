import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { PuzzleProps } from '@/types';
import { Tile, useHintEffect, usePuzzle, useTimers } from '@/games/shared';
import { genHiddenObject, type HiddenParams } from './generators';
import { ItemSprite, Scene, type SceneRing, type SceneTap } from './Scene';
import { paramsKey, useGentleMistake, useSolveOnce } from './helpers';

const GAP = 10;

export default function HiddenObject(props: PuzzleProps<HiddenParams>) {
  const { params, seed, width, height, paused, hintSignal } = props;
  const puzzle = usePuzzle(seed, (rng) => genHiddenObject(rng, params), [paramsKey(params)]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [hintId, setHintId] = useState<string | null>(null);
  const { later } = useTimers();
  const solve = useSolveOnce(() => props.onSolved());
  const mistake = useGentleMistake(props.onMistake);
  const total = puzzle.targets.length;
  const targetIds = useMemo(() => new Set(puzzle.targets.map((t) => t.id)), [puzzle.targets]);

  useEffect(() => {
    props.onProgress?.(found.size / total);
    if (found.size >= total) later(solve, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.size]);

  useHintEffect(hintSignal, () => {
    const t = puzzle.targets.find((x) => !found.has(x.id));
    if (t) setHintId(t.id);
  });

  const onTap = (t: SceneTap) => {
    if (paused || found.size >= total || !t.hit) return; // empty sand: no penalty
    const id = t.hit.id;
    if (targetIds.has(id)) {
      if (found.has(id)) return;
      setFound((s) => new Set(s).add(id));
      if (hintId === id) setHintId(null);
      props.onCorrect?.();
    } else {
      mistake();
    }
  };

  const rings = useMemo(() => {
    const byId = new Map(puzzle.scene.objects.map((o) => [o.id, o]));
    const r: SceneRing[] = [];
    for (const id of found) {
      const o = byId.get(id)!;
      r.push({ key: id, x: o.x, y: o.y, size: o.size, color: '#2E9C17' });
    }
    const h = hintId && !found.has(hintId) ? byId.get(hintId) : undefined;
    if (h) r.push({ key: `hint-${h.id}`, x: h.x, y: h.y, size: h.size, color: '#FFD23F', pulse: true });
    return r;
  }, [puzzle.scene.objects, found, hintId]);

  const cols = Math.min(total, 6);
  const tile = Math.min(64, Math.floor((width - GAP * (cols - 1)) / cols));
  const stripRows = Math.ceil(total / cols);
  const stripH = stripRows * (tile + 4) + (stripRows - 1) * 8;

  return (
    <View style={{ width, height, alignItems: 'center', gap: GAP }}>
      <Scene data={puzzle.scene} maxWidth={width} maxHeight={height - stripH - GAP} onTap={onTap} rings={rings} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width }}>
        {puzzle.targets.map((t) => (
          <Tile
            key={t.id}
            size={tile}
            state={found.has(t.id) ? 'correct' : hintId === t.id ? 'hint' : 'idle'}
          >
            <View style={{ opacity: found.has(t.id) ? 0.55 : 1 }}>
              <ItemSprite item={t.item} size={tile * 0.78} />
            </View>
          </Tile>
        ))}
      </View>
    </View>
  );
}
