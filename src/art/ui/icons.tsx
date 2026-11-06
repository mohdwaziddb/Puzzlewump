/** Small game UI icons drawn in SVG (glossy cartoon style). */
import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, RadialGradient } from 'react-native-svg';

type P = { size: number; color?: string };

const STAR_PATH =
  'M50 6 L62.5 35 L94 38 L70 59 L77 90 L50 74 L23 90 L30 59 L6 38 L37.5 35 Z';

export const StarIcon = React.memo(function StarIcon({ size, filled = true }: P & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={filled ? '#FFF27A' : '#E7DCCB'} />
          <Stop offset="0.55" stopColor={filled ? '#FFC21A' : '#C9BBA6'} />
          <Stop offset="1" stopColor={filled ? '#F08A00' : '#A8977F'} />
        </LinearGradient>
      </Defs>
      <Path d={STAR_PATH} fill={filled ? '#B65E00' : '#8C7C66'} transform="translate(0,4)" />
      <Path d={STAR_PATH} fill="url(#sg)" stroke={filled ? '#C46A00' : '#8C7C66'} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M40 30 Q50 22 58 30 L54 38 Q48 34 42 38 Z" fill="#fff" opacity={filled ? 0.6 : 0.3} />
    </Svg>
  );
});

export const CoinIcon = React.memo(function CoinIcon({ size }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF07A" />
          <Stop offset="0.5" stopColor="#FFC61A" />
          <Stop offset="1" stopColor="#E08E00" />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={54} r={42} fill="#B86A00" />
      <Circle cx={50} cy={50} r={42} fill="url(#cg)" stroke="#C47800" strokeWidth={3} />
      <Circle cx={50} cy={50} r={30} fill="none" stroke="#E09A00" strokeWidth={4} />
      <Path d="M50 30 L56 44 L71 45 L59 55 L63 70 L50 62 L37 70 L41 55 L29 45 L44 44 Z" fill="#FFE680" stroke="#D08A00" strokeWidth={2} />
      <Ellipse cx={36} cy={28} rx={10} ry={5} fill="#fff" opacity={0.7} transform="rotate(-30 36 28)" />
    </Svg>
  );
});

export const HeartIcon = React.memo(function HeartIcon({ size, filled = true }: P & { filled?: boolean }) {
  const d = 'M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={filled ? '#FF7A85' : '#D6D0D0'} />
          <Stop offset="1" stopColor={filled ? '#D81B33' : '#9C9494'} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill="url(#hg)" stroke={filled ? '#A3101F' : '#7d7575'} strokeWidth={4} />
      <Ellipse cx={30} cy={28} rx={10} ry={7} fill="#fff" opacity={filled ? 0.65 : 0.35} transform="rotate(-25 30 28)" />
    </Svg>
  );
});

export const LockIcon = React.memo(function LockIcon({ size }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M30 46 V32 a20 20 0 0 1 40 0 V46" fill="none" stroke="#5B6474" strokeWidth={10} strokeLinecap="round" />
      <Path d="M30 46 V32 a20 20 0 0 1 40 0 V46" fill="none" stroke="#A9B2C3" strokeWidth={5} strokeLinecap="round" />
      <Rect x={18} y={44} width={64} height={48} rx={12} fill="#F2B526" stroke="#A86F00" strokeWidth={4} />
      <Rect x={22} y={48} width={56} height={10} rx={5} fill="#FFE07A" />
      <Circle cx={50} cy={66} r={7} fill="#6B4300" />
      <Rect x={47} y={68} width={6} height={14} rx={3} fill="#6B4300" />
    </Svg>
  );
});

export const BulbIcon = React.memo(function BulbIcon({ size }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bg" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFBD0" />
          <Stop offset="0.6" stopColor="#FFE14D" />
          <Stop offset="1" stopColor="#F2A900" />
        </RadialGradient>
      </Defs>
      <Path d="M50 8 C28 8 16 25 16 41 C16 55 26 62 32 70 L68 70 C74 62 84 55 84 41 C84 25 72 8 50 8 Z" fill="url(#bg)" stroke="#C98500" strokeWidth={4} />
      <Rect x={33} y={70} width={34} height={10} rx={4} fill="#9AA6B8" stroke="#5E6878" strokeWidth={3} />
      <Rect x={36} y={80} width={28} height={9} rx={4} fill="#7E8A9C" stroke="#5E6878" strokeWidth={3} />
      <Path d="M42 66 L42 48 L50 56 L58 48 L58 66" fill="none" stroke="#E08A00" strokeWidth={4} strokeLinejoin="round" />
      <Ellipse cx={36} cy={28} rx={8} ry={12} fill="#fff" opacity={0.7} transform="rotate(30 36 28)" />
    </Svg>
  );
});

function Glyph({ size, children, color = '#fff' }: P & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G stroke={color} fill={color} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

export const PauseIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Rect x={26} y={20} width={16} height={60} rx={6} strokeWidth={0} />
    <Rect x={58} y={20} width={16} height={60} rx={6} strokeWidth={0} />
  </Glyph>
);

export const BackIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M60 20 L28 50 L60 80" fill="none" strokeWidth={14} />
    <Path d="M32 50 L80 50" fill="none" strokeWidth={14} />
  </Glyph>
);

export const NextIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M38 18 L72 50 L38 82" fill="none" strokeWidth={14} />
  </Glyph>
);

export const HomeIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M14 50 L50 18 L86 50" fill="none" strokeWidth={12} />
    <Path d="M26 46 L26 84 L44 84 L44 62 L56 62 L56 84 L74 84 L74 46 L50 26 Z" strokeWidth={0} />
  </Glyph>
);

export const RetryIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M78 50 A28 28 0 1 1 64 26" fill="none" strokeWidth={12} />
    <Path d="M56 10 L78 24 L58 40 Z" strokeWidth={4} />
  </Glyph>
);

export const CheckIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M20 52 L42 74 L82 28" fill="none" strokeWidth={14} />
  </Glyph>
);

export const CloseIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M26 26 L74 74 M74 26 L26 74" fill="none" strokeWidth={14} />
  </Glyph>
);

export const PlayIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M32 18 L80 50 L32 82 Z" strokeWidth={8} />
  </Glyph>
);

export const GearIcon = React.memo(function GearIcon({ size }: P) {
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(50 50)">
        {teeth.map((a) => (
          <Rect key={a} x={-9} y={-46} width={18} height={20} rx={4} fill="#5E6B80" transform={`rotate(${a})`} />
        ))}
        <Circle r={33} fill="#7D8BA3" stroke="#4A566A" strokeWidth={4} />
        <Circle r={13} fill="#E9EEF6" stroke="#4A566A" strokeWidth={4} />
        <Ellipse cx={-12} cy={-16} rx={10} ry={5} fill="#fff" opacity={0.45} transform="rotate(-35 -12 -16)" />
      </G>
    </Svg>
  );
});

export const ClockIcon = React.memo(function ClockIcon({ size }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={42} y={4} width={16} height={12} rx={4} fill="#5E6B80" />
      <Circle cx={50} cy={56} r={38} fill="#fff" stroke="#3B4659" strokeWidth={8} />
      <Path d="M50 56 L50 32 M50 56 L66 64" stroke="#E53935" strokeWidth={7} strokeLinecap="round" />
      <Circle cx={50} cy={56} r={5} fill="#3B4659" />
    </Svg>
  );
});

export const MusicIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M38 74 V24 L80 14 V64" fill="none" strokeWidth={9} />
    <Ellipse cx={28} cy={76} rx={14} ry={11} strokeWidth={0} />
    <Ellipse cx={70} cy={66} rx={14} ry={11} strokeWidth={0} />
  </Glyph>
);

export const SoundIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Path d="M16 38 L34 38 L56 18 L56 82 L34 62 L16 62 Z" strokeWidth={4} />
    <Path d="M68 34 Q78 50 68 66 M78 24 Q94 50 78 76" fill="none" strokeWidth={8} />
  </Glyph>
);

export const VibrateIcon = ({ size, color }: P) => (
  <Glyph size={size} color={color}>
    <Rect x={34} y={14} width={32} height={72} rx={8} fill="none" strokeWidth={8} />
    <Path d="M18 34 L12 42 L18 50 L12 58 L18 66 M82 34 L88 42 L82 50 L88 58 L82 66" fill="none" strokeWidth={6} />
  </Glyph>
);
