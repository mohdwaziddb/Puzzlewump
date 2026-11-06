/**
 * 'jungle-hidden' — hidden objects in a layered jungle scene.
 * Targets (shown in the strip at the bottom) hide among distractors, partly covered by leaves.
 * Tap a target to find it; tapping a distractor item is a mistake. Tapping empty jungle does nothing.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import type { PuzzleProps } from '@/types';
import { ItemIcon } from '@/art/items';
import { CheckIcon } from '@/art/ui';
import { AudioService } from '@/services/AudioService';
import { PopIn, Tile, useHintEffect, usePuzzle, useShake, useTimers } from '@/games/shared';
import { generateHiddenScene, SCENE_H, SCENE_W, type HiddenDecor, type HiddenItem, type HiddenParams } from './generators';
import { BoardFrame, FRAME } from './kit/boards';
import { GlowDisc, JUNGLE } from './kit/art';

/* ---------------------------------------------------------- scenery */

function decorShape(d: HiddenDecor, i: number) {
  const s = d.size;
  const sx = d.flip ? -1 : 1;
  const tf = `translate(${d.x} ${d.y}) scale(${sx} 1)`;
  switch (d.kind) {
    case 'fern':
      return (
        <G key={i} transform={tf}>
          {[-50, -25, 0, 25, 50].map((a, k) => (
            <Path
              key={k}
              d={`M0 0 Q${s * 0.1} ${-s * 0.5} ${Math.sin((a * Math.PI) / 180) * s * 0.6} ${-Math.cos((a * Math.PI) / 180) * s * 0.7}`}
              stroke={k % 2 ? '#2E7D32' : '#388E3C'}
              strokeWidth={s * 0.09}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </G>
      );
    case 'bush':
      return (
        <G key={i} transform={tf}>
          <Circle cx={-s * 0.25} cy={-s * 0.15} r={s * 0.28} fill="#2E7D32" />
          <Circle cx={s * 0.25} cy={-s * 0.15} r={s * 0.28} fill="#2E7D32" />
          <Circle cx={0} cy={-s * 0.32} r={s * 0.32} fill="#388E3C" />
          <Circle cx={-s * 0.08} cy={-s * 0.42} r={s * 0.1} fill="#66BB6A" />
        </G>
      );
    case 'flower':
      return (
        <G key={i} transform={tf}>
          <Path d={`M0 0 V${-s * 0.4}`} stroke="#2E7D32" strokeWidth={s * 0.06} />
          {[0, 72, 144, 216, 288].map((a, k) => (
            <Circle key={k} cx={Math.cos((a * Math.PI) / 180) * s * 0.12} cy={-s * 0.45 + Math.sin((a * Math.PI) / 180) * s * 0.12} r={s * 0.09} fill="#F06292" />
          ))}
          <Circle cx={0} cy={-s * 0.45} r={s * 0.07} fill="#FFD23F" />
        </G>
      );
    case 'rock':
      return (
        <G key={i} transform={tf}>
          <Ellipse cx={0} cy={-s * 0.12} rx={s * 0.32} ry={s * 0.18} fill="#9E9A92" />
          <Ellipse cx={-s * 0.08} cy={-s * 0.2} rx={s * 0.12} ry={s * 0.05} fill="#C9C4BA" />
        </G>
      );
    default:
      return (
        <G key={i} transform={tf}>
          <Rect x={-s * 0.05} y={-s * 0.25} width={s * 0.1} height={s * 0.25} fill="#FFF3E0" />
          <Path d={`M${-s * 0.18} ${-s * 0.24} Q0 ${-s * 0.5} ${s * 0.18} ${-s * 0.24} Z`} fill="#E57373" />
        </G>
      );
  }
}

const JungleBackdrop = React.memo(function JungleBackdrop({ decor, w, h }: { decor: HiddenDecor[]; w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <SvgGradient id="jsky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A5D6A7" />
          <Stop offset="0.35" stopColor="#7BCB4C" />
          <Stop offset="1" stopColor="#4E9A2C" />
        </SvgGradient>
      </Defs>
      <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#jsky)" />
      {/* far trees */}
      <Path d="M0 40 Q10 18 22 34 Q32 14 46 32 Q58 12 70 30 Q84 14 100 32 V60 H0 Z" fill="#558B2F" opacity={0.7} />
      {/* trunks */}
      <Rect x={8} y={20} width={7} height={110} rx={3} fill="#795548" />
      <Rect x={84} y={14} width={8} height={116} rx={3} fill="#6D4C41" />
      <Rect x={52} y={30} width={5} height={60} rx={2} fill="#8D6E63" opacity={0.8} />
      {/* ground path */}
      <Path d="M30 128 Q40 100 55 92 Q70 84 62 70 Q56 60 70 52" stroke={JUNGLE.dirt} strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.75} />
      {/* canopy */}
      <Path d="M-5 0 H105 V10 Q95 22 84 12 Q74 24 62 12 Q50 24 38 12 Q26 24 14 12 Q4 22 -5 10 Z" fill="#1B5E20" />
      {/* vines */}
      <Path d="M20 8 Q24 28 18 46" stroke="#2E7D32" strokeWidth={1.6} fill="none" />
      <Path d="M70 8 Q66 22 72 36" stroke="#2E7D32" strokeWidth={1.6} fill="none" />
      {decor.map(decorShape)}
    </Svg>
  );
});

/** Leaf drawn over an item (the overlay never blocks taps). */
function leafPath(it: HiddenItem) {
  if (!it.leaf) return null;
  const { x, y, size, rot } = it.leaf;
  const r = size / 2;
  return (
    <G key={`l${it.id}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <Path d={`M0 ${-r} Q${r * 0.85} 0 0 ${r} Q${-r * 0.85} 0 0 ${-r} Z`} fill="#43A047" stroke="#1B5E20" strokeWidth={0.6} />
      <Path d={`M0 ${-r * 0.9} V${r * 0.9}`} stroke="#A5D6A7" strokeWidth={0.5} />
    </G>
  );
}

/* ------------------------------------------------------------- items */

function SceneItem({
  item,
  k,
  found,
  hinted,
  disabled,
  onTap,
}: {
  item: HiddenItem;
  k: number;
  found: boolean;
  hinted: boolean;
  disabled: boolean;
  onTap: (it: HiddenItem) => boolean;
}) {
  const { shake, shakeStyle } = useShake();
  const box = item.size * k;
  return (
    <Animated.View style={[{ position: 'absolute', left: (item.x - item.size / 2) * k, top: (item.y - item.size / 2) * k, width: box, height: box }, shakeStyle]}>
      {(hinted || found) && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -box * 0.3, top: -box * 0.3 }}>
          <PulseGlow size={box * 1.6} on={hinted && !found} color={found ? '#C9FFB0' : JUNGLE.glow} />
        </View>
      )}
      <Pressable
        hitSlop={6}
        disabled={disabled || found}
        onPress={() => {
          if (!onTap(item)) shake();
        }}
        style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${item.rot}deg` }] }}
      >
        <ItemIcon name={item.name} size={box * 0.95} />
      </Pressable>
      {found && (
        <View pointerEvents="none" style={{ position: 'absolute', right: -4, top: -4 }}>
          <PopIn k="f">
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#2E9C17', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={13} />
            </View>
          </PopIn>
        </View>
      )}
    </Animated.View>
  );
}

function PulseGlow({ size, on, color }: { size: number; on: boolean; color: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = on ? withRepeat(withSequence(withTiming(1.25, { duration: 420 }), withTiming(0.9, { duration: 420 })), -1) : withTiming(1);
  }, [on, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={st}>
      <GlowDisc size={size} color={color} />
    </Animated.View>
  );
}

/* -------------------------------------------------------------- game */

export default function JungleHiddenGame(props: PuzzleProps<HiddenParams>) {
  const { params, seed, onSolved, onMistake, onCorrect, onProgress, hintSignal, paused, width, height } = props;
  const scene = usePuzzle(seed, () => generateHiddenScene(seed, params), [params.targets, params.distractors]);
  const [found, setFound] = useState<number[]>([]);
  const [hinted, setHinted] = useState<number | null>(null);
  const solvedRef = useRef(false);
  const { later } = useTimers();

  const targets = useMemo(() => scene.targetIds.map((id) => scene.items.find((i) => i.id === id)!), [scene]);

  // layout: strip at the bottom
  const nT = targets.length;
  const stripCols = Math.min(nT, 6);
  const stripRows = Math.ceil(nT / stripCols);
  const tile = Math.floor(Math.min(stripRows > 1 ? 46 : 58, (width - 8 * (stripCols - 1)) / stripCols));
  const stripH = stripRows * (tile + 4) + (stripRows - 1) * 8;
  const sceneMaxH = height - stripH - 22;
  const k = Math.min((width - FRAME * 2 - 4) / SCENE_W, sceneMaxH / SCENE_H);
  const sw = SCENE_W * k;
  const sh = SCENE_H * k;

  const onTap = useCallback(
    (it: HiddenItem) => {
      if (paused || solvedRef.current) return true;
      if (!it.target) {
        AudioService.play('wrong');
        onMistake();
        return false;
      }
      if (found.includes(it.id)) return true;
      const next = [...found, it.id];
      setFound(next);
      if (hinted === it.id) setHinted(null);
      AudioService.play('correct');
      onCorrect?.();
      onProgress?.(next.length / nT);
      if (next.length === nT) {
        solvedRef.current = true;
        later(() => onSolved(), 600);
      }
      return true;
    },
    [paused, found, hinted, nT, onMistake, onCorrect, onProgress, onSolved, later],
  );

  useHintEffect(hintSignal, () => {
    const left = targets.filter((t) => !found.includes(t.id));
    if (!left.length) return;
    setHinted(left[0].id);
  });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly' }}>
      <BoardFrame width={sw} height={sh}>
        <JungleBackdrop decor={scene.decor} w={sw} h={sh} />
        {scene.items.map((it) => (
          <SceneItem key={it.id} item={it} k={k} found={found.includes(it.id)} hinted={hinted === it.id} disabled={paused} onTap={onTap} />
        ))}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <Svg width={sw} height={sh} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
            {scene.items.filter((it) => !found.includes(it.id)).map(leafPath)}
          </Svg>
        </View>
      </BoardFrame>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width }}>
        {targets.map((t) => {
          const isFound = found.includes(t.id);
          return (
            <Tile key={t.id} size={tile} state={isFound ? 'correct' : hinted === t.id ? 'hint' : 'idle'}>
              <View style={{ opacity: isFound ? 0.55 : 1 }}>
                <ItemIcon name={t.name} size={tile * 0.78} />
              </View>
              {isFound && (
                <View style={{ position: 'absolute' }}>
                  <CheckIcon size={tile * 0.5} />
                </View>
              )}
            </Tile>
          );
        })}
      </View>
    </View>
  );
}
