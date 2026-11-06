/**
 * Jungle drawings for the Mystery Jungle mechanics (react-native-svg, no images/emoji).
 * Tile painters return <G> fragments in a unit box (x, y, s) so a whole board can be one <Svg>.
 */
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import { CharacterArt } from '@/art/characters';
import { useProgress } from '@/store/progressStore';
import type { Dir } from '../generators';

export const JUNGLE = {
  grassA: '#7BCB4C',
  grassB: '#6DBD41',
  grassDark: '#4E9A2C',
  dirt: '#D9B27A',
  dirtDark: '#B88B52',
  hedge: '#2E7D32',
  hedgeDark: '#1B5E20',
  hedgeLight: '#56A845',
  stone: '#A7A29A',
  stoneLight: '#CFCAC0',
  stoneDark: '#6F6A63',
  water: '#4FC3F7',
  waterDark: '#1E88C9',
  gold: '#FFD23F',
  glow: '#FFF59D',
};

/* ------------------------------------------------------------ tile paint */

/** Grass floor tile with a couple of tufts. `v` varies the look per cell. */
export function grassTile(key: string | number, x: number, y: number, s: number, v: number) {
  const fill = v % 2 === 0 ? JUNGLE.grassA : JUNGLE.grassB;
  const tx = x + s * (0.25 + ((v * 37) % 50) / 100);
  const ty = y + s * (0.3 + ((v * 53) % 40) / 100);
  return (
    <G key={key}>
      <Rect x={x} y={y} width={s + 0.5} height={s + 0.5} fill={fill} />
      {v % 3 !== 0 && (
        <Path
          d={`M${tx} ${ty + s * 0.12} l${s * 0.04} ${-s * 0.12} l${s * 0.04} ${s * 0.12} l${s * 0.04} ${-s * 0.1} l${s * 0.03} ${s * 0.1}`}
          stroke={JUNGLE.grassDark}
          strokeWidth={Math.max(1, s * 0.03)}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </G>
  );
}

/** Leafy bush that fills a cell (used as solid walls / obstacles). */
export function bushTile(key: string | number, x: number, y: number, s: number) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  return (
    <G key={key}>
      <Ellipse cx={cx} cy={y + s * 0.88} rx={s * 0.42} ry={s * 0.1} fill="rgba(0,0,0,0.18)" />
      <Circle cx={cx - s * 0.2} cy={cy + s * 0.08} r={s * 0.26} fill={JUNGLE.hedgeDark} />
      <Circle cx={cx + s * 0.2} cy={cy + s * 0.08} r={s * 0.26} fill={JUNGLE.hedgeDark} />
      <Circle cx={cx} cy={cy - s * 0.1} r={s * 0.3} fill={JUNGLE.hedge} />
      <Circle cx={cx - s * 0.18} cy={cy + s * 0.04} r={s * 0.2} fill={JUNGLE.hedge} />
      <Circle cx={cx + s * 0.18} cy={cy + s * 0.04} r={s * 0.2} fill={JUNGLE.hedge} />
      <Circle cx={cx - s * 0.08} cy={cy - s * 0.2} r={s * 0.1} fill={JUNGLE.hedgeLight} />
      <Circle cx={cx + s * 0.16} cy={cy - s * 0.04} r={s * 0.06} fill={JUNGLE.hedgeLight} />
    </G>
  );
}

/** Mossy boulder obstacle. */
export function rockTile(key: string | number, x: number, y: number, s: number) {
  return (
    <G key={key}>
      <Ellipse cx={x + s / 2} cy={y + s * 0.86} rx={s * 0.4} ry={s * 0.09} fill="rgba(0,0,0,0.2)" />
      <Path
        d={`M${x + s * 0.12} ${y + s * 0.8} Q${x + s * 0.08} ${y + s * 0.35} ${x + s * 0.4} ${y + s * 0.2} Q${x + s * 0.8} ${y + s * 0.12} ${x + s * 0.88} ${y + s * 0.55} Q${x + s * 0.92} ${y + s * 0.82} ${x + s * 0.5} ${y + s * 0.84} Z`}
        fill={JUNGLE.stone}
        stroke={JUNGLE.stoneDark}
        strokeWidth={Math.max(1, s * 0.04)}
      />
      <Path d={`M${x + s * 0.3} ${y + s * 0.32} Q${x + s * 0.45} ${y + s * 0.24} ${x + s * 0.62} ${y + s * 0.28}`} stroke={JUNGLE.stoneLight} strokeWidth={s * 0.06} strokeLinecap="round" fill="none" />
      <Ellipse cx={x + s * 0.42} cy={y + s * 0.22} rx={s * 0.16} ry={s * 0.06} fill={JUNGLE.hedgeLight} opacity={0.85} />
    </G>
  );
}

/** River / pond tile. */
export function waterTile(key: string | number, x: number, y: number, s: number) {
  return (
    <G key={key}>
      <Rect x={x + s * 0.04} y={y + s * 0.04} width={s * 0.92} height={s * 0.92} rx={s * 0.28} fill={JUNGLE.water} stroke={JUNGLE.waterDark} strokeWidth={Math.max(1, s * 0.04)} />
      <Path d={`M${x + s * 0.2} ${y + s * 0.4} q${s * 0.1} ${-s * 0.08} ${s * 0.2} 0 t${s * 0.2} 0`} stroke="#E1F5FE" strokeWidth={s * 0.05} fill="none" strokeLinecap="round" />
      <Path d={`M${x + s * 0.4} ${y + s * 0.65} q${s * 0.1} ${-s * 0.08} ${s * 0.2} 0 t${s * 0.2} 0`} stroke="#E1F5FE" strokeWidth={s * 0.05} fill="none" strokeLinecap="round" />
      <Ellipse cx={x + s * 0.24} cy={y + s * 0.72} rx={s * 0.12} ry={s * 0.07} fill="#66BB6A" />
    </G>
  );
}

/** Carved temple-ruin wall block (push puzzle room walls). */
export function ruinTile(key: string | number, x: number, y: number, s: number, v: number) {
  return (
    <G key={key}>
      <Rect x={x} y={y} width={s + 0.5} height={s + 0.5} fill={JUNGLE.stoneDark} />
      <Rect x={x + s * 0.05} y={y + s * 0.05} width={s * 0.9} height={s * 0.42} rx={s * 0.06} fill={JUNGLE.stone} />
      <Rect x={x + s * 0.05} y={y + s * 0.53} width={s * 0.42} height={s * 0.42} rx={s * 0.06} fill={JUNGLE.stone} />
      <Rect x={x + s * 0.53} y={y + s * 0.53} width={s * 0.42} height={s * 0.42} rx={s * 0.06} fill={JUNGLE.stone} />
      {v % 3 === 0 && <Ellipse cx={x + s * 0.3} cy={y + s * 0.1} rx={s * 0.22} ry={s * 0.08} fill={JUNGLE.hedgeLight} />}
      {v % 4 === 1 && <Path d={`M${x + s * 0.75} ${y} q${-s * 0.1} ${s * 0.3} ${s * 0.05} ${s * 0.6}`} stroke={JUNGLE.hedge} strokeWidth={s * 0.07} fill="none" strokeLinecap="round" />}
    </G>
  );
}

/** Dirt floor of the temple room. */
export function dirtTile(key: string | number, x: number, y: number, s: number, v: number) {
  return (
    <G key={key}>
      <Rect x={x} y={y} width={s + 0.5} height={s + 0.5} fill={v % 2 ? JUNGLE.dirt : '#D2A970'} />
      {v % 3 === 1 && <Circle cx={x + s * 0.3} cy={y + s * 0.7} r={s * 0.05} fill={JUNGLE.dirtDark} />}
      {v % 4 === 2 && <Circle cx={x + s * 0.7} cy={y + s * 0.3} r={s * 0.04} fill={JUNGLE.dirtDark} />}
    </G>
  );
}

/** Glowing target pad. */
export function padTile(key: string | number, x: number, y: number, s: number) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  return (
    <G key={key}>
      <Circle cx={cx} cy={cy} r={s * 0.42} fill={JUNGLE.glow} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={s * 0.32} fill="none" stroke={JUNGLE.gold} strokeWidth={s * 0.08} />
      <Path d={`M${cx} ${cy - s * 0.14} L${cx + s * 0.14} ${cy} L${cx} ${cy + s * 0.14} L${cx - s * 0.14} ${cy} Z`} fill={JUNGLE.gold} />
    </G>
  );
}

/* ------------------------------------------------------------- objects */

/** Stepped jungle temple (maze goal). */
export function TempleArt({ size, locked }: { size: number; locked?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={42} ry={6} fill="rgba(0,0,0,0.2)" />
      <Rect x={10} y={66} width={80} height={24} rx={3} fill="#B0A48F" stroke="#6F6555" strokeWidth={3} />
      <Rect x={20} y={46} width={60} height={22} rx={3} fill="#C4B8A2" stroke="#6F6555" strokeWidth={3} />
      <Rect x={30} y={28} width={40} height={20} rx={3} fill="#D6CBB5" stroke="#6F6555" strokeWidth={3} />
      <Path d="M36 28 L50 10 L64 28 Z" fill={JUNGLE.gold} stroke="#B07D00" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M40 90 L40 70 Q50 58 60 70 L60 90 Z" fill="#3E2A16" />
      {locked && (
        <G>
          <Rect x={38} y={66} width={24} height={24} fill="none" stroke="#7A3F17" strokeWidth={4} />
          <Path d="M44 66 V90 M50 64 V90 M56 66 V90" stroke="#B86B32" strokeWidth={4} />
          <Circle cx={50} cy={78} r={6} fill={JUNGLE.gold} stroke="#B07D00" strokeWidth={2} />
        </G>
      )}
      <Path d="M12 66 q8 -10 16 0" stroke={JUNGLE.hedge} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M72 46 q8 -10 14 2" stroke={JUNGLE.hedge} strokeWidth={5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Carved stone block that can be pushed. Glows gold when resting on a pad. */
export function CrateArt({ size, onPad }: { size: number; onPad?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={8} y={14} width={84} height={80} rx={12} fill={onPad ? '#C99A12' : '#6F6A63'} />
      <Rect x={8} y={8} width={84} height={78} rx={12} fill={onPad ? '#FFD23F' : '#B9B3A8'} stroke={onPad ? '#B07D00' : '#6F6A63'} strokeWidth={4} />
      <Rect x={20} y={20} width={60} height={54} rx={8} fill="none" stroke={onPad ? '#E0A400' : '#8E887E'} strokeWidth={4} />
      <Path d="M50 30 L62 47 L50 64 L38 47 Z" fill={onPad ? '#FFF59D' : '#D7D1C6'} stroke={onPad ? '#B07D00' : '#8E887E'} strokeWidth={3} />
      {!onPad && <Path d="M14 22 q10 -8 22 -6" stroke={JUNGLE.hedgeLight} strokeWidth={6} fill="none" strokeLinecap="round" />}
    </Svg>
  );
}

/** Big chunky arrow pointing in `dir`. */
export function ArrowIcon({ dir, size, color = '#FFFFFF', stroke = '#5A3A16' }: { dir: Dir; size: number; color?: string; stroke?: string }) {
  const rot = dir === 'R' ? 0 : dir === 'D' ? 90 : dir === 'L' ? 180 : 270;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform={`rotate(${rot} 50 50)`}>
        <Path d="M14 38 H54 V18 L88 50 L54 82 V62 H14 Z" fill={color} stroke={stroke} strokeWidth={8} strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

/** Sparkly footprints used for hints (drawn in a cell box). */
export function footprintMark(key: string | number, x: number, y: number, s: number, dir: Dir, alpha: number) {
  const rot = dir === 'U' ? 0 : dir === 'R' ? 90 : dir === 'D' ? 180 : 270;
  const cx = x + s / 2;
  const cy = y + s / 2;
  return (
    <G key={key} transform={`rotate(${rot} ${cx} ${cy})`} opacity={alpha}>
      <Circle cx={cx} cy={cy} r={s * 0.4} fill={JUNGLE.glow} opacity={0.45} />
      <Ellipse cx={cx - s * 0.11} cy={cy + s * 0.08} rx={s * 0.08} ry={s * 0.14} fill="#FFB300" />
      <Ellipse cx={cx + s * 0.11} cy={cy - s * 0.1} rx={s * 0.08} ry={s * 0.14} fill="#FFB300" />
    </G>
  );
}

/* ------------------------------------------------------------ explorer */

/** The player's selected character as a round token (reads well at small sizes). */
export function ExplorerToken({ size }: { size: number }) {
  const id = useProgress((s) => s.save.selectedCharacter);
  const ring = Math.max(2, size * 0.08);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFF4DC',
        borderWidth: ring,
        borderColor: '#FF8A3D',
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}
    >
      {/* show head + shoulders: character box is size x size*1.25 */}
      <View style={{ marginTop: size * 0.02 }}>
        <CharacterArt id={id} size={size * 1.15} expression="happy" />
      </View>
    </View>
  );
}

/** Small radial glow disc (behind targets / for hints). */
export function GlowDisc({ size, color = JUNGLE.glow }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="g" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill="url(#g)" />
    </Svg>
  );
}
