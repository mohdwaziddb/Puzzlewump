/**
 * Board renderers shared by the jungle grid games.
 *  - BoardFrame     wooden frame around a board
 *  - TileBoard      one memoized <Svg> painting every cell via a painter (fast even at 15x15)
 *  - MazeSvg        grass floor + hedge walls for a wall-bitmask maze
 *  - GridToken      absolutely positioned piece that glides between cells (and nudges on bumps)
 *  - FootprintLayer glowing hint footprints over cells
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { WALL_BIT, type Dir, type Maze, DR, DC } from '../generators';
import { JUNGLE, footprintMark, grassTile } from './art';

export const FRAME = 6;

export function BoardFrame({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: 'center',
        padding: FRAME,
        borderRadius: 14,
        backgroundColor: colors.wood,
        borderWidth: 2,
        borderColor: colors.woodDeep,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <View style={{ width, height, borderRadius: 8, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export type CellPainter = (i: number, x: number, y: number, s: number, variant: number) => React.ReactNode;

/** Paints a cols x rows tile map into a single Svg. Re-renders only when `version` changes. */
export const TileBoard = React.memo(
  function TileBoard({ cols, rows, cell, paint }: { cols: number; rows: number; cell: number; paint: CellPainter; version: string }) {
    const tiles: React.ReactNode[] = [];
    for (let i = 0; i < cols * rows; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      tiles.push(paint(i, c * cell, r * cell, cell, (r * 7 + c * 13 + r * c) % 11));
    }
    return (
      <Svg width={cols * cell} height={rows * cell} style={{ position: 'absolute', left: 0, top: 0 }}>
        {tiles}
      </Svg>
    );
  },
  (a, b) => a.version === b.version && a.cell === b.cell,
);

/** Grass + hedge maze. Walls are drawn as thick leafy strokes on cell edges. */
export const MazeSvg = React.memo(function MazeSvg({ maze, cell }: { maze: Maze; cell: number }) {
  const n = maze.size;
  let d = '';
  for (let i = 0; i < n * n; i++) {
    const x = (i % n) * cell;
    const y = Math.floor(i / n) * cell;
    const w = maze.walls[i];
    if (w & WALL_BIT.U) d += `M${x} ${y}H${x + cell}`;
    if (w & WALL_BIT.L) d += `M${x} ${y}V${y + cell}`;
    if (Math.floor(i / n) === n - 1 && w & WALL_BIT.D) d += `M${x} ${y + cell}H${x + cell}`;
    if (i % n === n - 1 && w & WALL_BIT.R) d += `M${x + cell} ${y}V${y + cell}`;
  }
  const sw = Math.max(4, cell * 0.24);
  const posts: React.ReactNode[] = [];
  for (let r = 0; r <= n; r++)
    for (let c = 0; c <= n; c++) {
      if ((r * 5 + c * 3) % 4 !== 0) continue;
      posts.push(<Circle key={`p${r}-${c}`} cx={c * cell} cy={r * cell} r={sw * 0.62} fill={JUNGLE.hedge} />);
    }
  const tiles: React.ReactNode[] = [];
  for (let i = 0; i < n * n; i++) tiles.push(grassTile(i, (i % n) * cell, Math.floor(i / n) * cell, cell, (i * 7 + Math.floor(i / n)) % 11));
  return (
    <Svg width={n * cell} height={n * cell} style={{ position: 'absolute', left: 0, top: 0 }}>
      {tiles}
      <Path d={d} stroke="rgba(0,0,0,0.22)" strokeWidth={sw} strokeLinecap="round" transform={`translate(0 ${sw * 0.3})`} />
      <Path d={d} stroke={JUNGLE.hedgeDark} strokeWidth={sw} strokeLinecap="round" />
      <Path d={d} stroke={JUNGLE.hedge} strokeWidth={sw * 0.62} strokeLinecap="round" />
      {posts}
      <Path d={d} stroke={JUNGLE.hedgeLight} strokeWidth={sw * 0.16} strokeLinecap="round" strokeDasharray={`${sw * 0.3} ${sw * 0.9}`} />
    </Svg>
  );
});

/**
 * A piece that sits on cell `index` and glides there when it changes.
 * Change `bump` (e.g. a counter) together with `bumpDir` to play a "blocked" nudge.
 */
export function GridToken({
  index,
  cols,
  cell,
  size,
  children,
  duration = 140,
  bump,
  bumpDir,
  zIndex,
}: {
  index: number;
  cols: number;
  cell: number;
  /** token box size (defaults to cell) */
  size?: number;
  children: React.ReactNode;
  duration?: number;
  bump?: number;
  bumpDir?: Dir;
  zIndex?: number;
}) {
  const s = size ?? cell;
  const off = (cell - s) / 2;
  const tx = useSharedValue((index % cols) * cell + off);
  const ty = useSharedValue(Math.floor(index / cols) * cell + off);
  const nx = useSharedValue(0);
  const ny = useSharedValue(0);
  useEffect(() => {
    tx.value = withTiming((index % cols) * cell + off, { duration });
    ty.value = withTiming(Math.floor(index / cols) * cell + off, { duration });
  }, [index, cols, cell, off, duration, tx, ty]);
  useEffect(() => {
    if (!bump || !bumpDir) return;
    const amt = cell * 0.18;
    nx.value = withSequence(withTiming(DC[bumpDir] * amt, { duration: 70 }), withTiming(0, { duration: 120 }));
    ny.value = withSequence(withTiming(DR[bumpDir] * amt, { duration: 70 }), withTiming(0, { duration: 120 }));
  }, [bump, bumpDir, cell, nx, ny]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value + nx.value }, { translateY: ty.value + ny.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: s, height: s, zIndex }, st]}>
      {children}
    </Animated.View>
  );
}

/** Pulsing glowing footprints along `steps` (cell + direction of travel). */
export function FootprintLayer({
  steps,
  cols,
  rows,
  cell,
  extra,
}: {
  steps: { cell: number; dir: Dir }[];
  cols: number;
  rows: number;
  cell: number;
  /** optional extra svg (e.g. a push arrow) */
  extra?: React.ReactNode;
}) {
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.55, { duration: 450 })), -1);
  }, [pulse]);
  const st = useAnimatedStyle(() => ({ opacity: pulse.value }));
  if (!steps.length && !extra) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      <Svg width={cols * cell} height={rows * cell}>
        {steps.map((s, k) =>
          footprintMark(k, (s.cell % cols) * cell, Math.floor(s.cell / cols) * cell, cell, s.dir, 1 - k * (0.5 / Math.max(1, steps.length))),
        )}
        {extra}
      </Svg>
    </Animated.View>
  );
}

/** Golden arrow drawn in a cell (used to show the next push). */
export function cellArrow(key: string, cellIndex: number, cols: number, cell: number, dir: Dir) {
  const x = (cellIndex % cols) * cell;
  const y = Math.floor(cellIndex / cols) * cell;
  const rot = dir === 'R' ? 0 : dir === 'D' ? 90 : dir === 'L' ? 180 : 270;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const s = cell / 100;
  return (
    <G key={key} transform={`rotate(${rot} ${cx} ${cy})`}>
      <Rect x={x + 4} y={y + 4} width={cell - 8} height={cell - 8} rx={cell * 0.2} fill="none" stroke={JUNGLE.gold} strokeWidth={Math.max(2, cell * 0.08)} />
      <Path
        d={`M${cx - 26 * s} ${cy - 10 * s} H${cx + 4 * s} V${cy - 26 * s} L${cx + 34 * s} ${cy} L${cx + 4 * s} ${cy + 26 * s} V${cy + 10 * s} H${cx - 26 * s} Z`}
        fill={JUNGLE.gold}
        stroke="#B07D00"
        strokeWidth={Math.max(1.5, 5 * s)}
        strokeLinejoin="round"
      />
    </G>
  );
}
