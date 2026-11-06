/**
 * One reusable SVG renderer for every Logic Galaxy shape descriptor:
 * kind x colour x size x fill (solid/striped/dotted/outline) x rotation x count, plus polyominoes.
 */
import React, { useId } from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Circle } from 'react-native-svg';
import type { ShapeColor, ShapeDesc, ShapeKind, ShapeSize } from './generators';
import { visibleRotation } from './generators';

export const SHAPE_PALETTE: Record<ShapeColor, { main: string; light: string; dark: string }> = {
  red: { main: '#FF4D5E', light: '#FFA3AD', dark: '#A81D2C' },
  orange: { main: '#FF962E', light: '#FFD09A', dark: '#A85400' },
  yellow: { main: '#FFD23B', light: '#FFF2A8', dark: '#A88300' },
  green: { main: '#36CC55', light: '#A8F2B4', dark: '#1B7F30' },
  blue: { main: '#3D8BFF', light: '#A6CBFF', dark: '#1745A0' },
  purple: { main: '#A85CFF', light: '#DAB8FF', dark: '#5E21AE' },
};

const SIZE_SCALE: Record<ShapeSize, number> = { s: 0.52, m: 0.76, l: 1 };

function polygon(n: number, r: number, inner?: number, start = -90): string {
  const pts: string[] = [];
  const total = inner ? n * 2 : n;
  for (let i = 0; i < total; i++) {
    const rad = inner && i % 2 === 1 ? inner : r;
    const a = ((start + (360 / total) * i) * Math.PI) / 180;
    pts.push(`${(50 + rad * Math.cos(a)).toFixed(1)} ${(50 + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const PATHS: Record<Exclude<ShapeKind, 'poly'>, string> = {
  circle: 'M50 8 A42 42 0 1 1 49.9 8 Z',
  square: 'M24 12 H76 Q88 12 88 24 V76 Q88 88 76 88 H24 Q12 88 12 76 V24 Q12 12 24 12 Z',
  triangle: 'M50 9 L91 85 H9 Z',
  star: polygon(5, 46, 20),
  hexagon: polygon(6, 44, undefined, 0),
  pentagon: polygon(5, 45),
  heart:
    'M50 88 C22 68 7 52 7 33 C7 19 18 9 31 9 C40 9 46 14 50 22 C54 14 60 9 69 9 C82 9 93 19 93 33 C93 52 78 68 50 88 Z',
  diamond: 'M50 5 L88 50 L50 95 L12 50 Z',
  moon: 'M71 13.6 A42 42 0 1 0 71 86.4 A40 40 0 0 1 71 13.6 Z',
  cross: 'M37 8 H63 V37 H92 V63 H63 V92 H37 V63 H8 V37 H37 Z',
  arrow: 'M8 37 H54 V14 L93 50 L54 86 V63 H8 Z',
  lblock: 'M14 8 H44 V60 H86 V90 H14 Z',
};

/** Where copies go when count > 1 (x, y, scale) inside the 100x100 box. */
function countLayout(n: number): [number, number, number][] {
  switch (n) {
    case 1:
      return [[50, 50, 1]];
    case 2:
      return [
        [27, 50, 0.48],
        [73, 50, 0.48],
      ];
    case 3:
      return [
        [50, 27, 0.44],
        [27, 72, 0.44],
        [73, 72, 0.44],
      ];
    case 4:
      return [
        [27, 27, 0.44],
        [73, 27, 0.44],
        [27, 73, 0.44],
        [73, 73, 0.44],
      ];
    case 5:
      return [
        [22, 22, 0.38],
        [78, 22, 0.38],
        [50, 50, 0.38],
        [22, 78, 0.38],
        [78, 78, 0.38],
      ];
    default:
      return Array.from({ length: Math.min(n, 9) }, (_, i) => {
        const cols = 3;
        const r = Math.floor(i / cols);
        const c = i % cols;
        const rows = Math.ceil(Math.min(n, 9) / cols);
        return [18 + c * 32, 50 + (r - (rows - 1) / 2) * 34, 0.3] as [number, number, number];
      });
  }
}

const STRIPES = Array.from({ length: 12 }, (_, i) => `M${-40 + i * 16} -10 L${20 + i * 16} 110`).join(' ');
const DOTS: [number, number][] = [];
for (let y = 10; y <= 90; y += 18) for (let x = (y / 18) % 2 ? 10 : 19; x <= 92; x += 18) DOTS.push([x, y]);

function Body({ d, fill, pal, uid }: { d: string; fill: ShapeDesc['fill']; pal: (typeof SHAPE_PALETTE)[ShapeColor]; uid: string }) {
  const clip = `url(#c${uid})`;
  if (fill === 'outline') {
    return <Path d={d} fill="#FFFFFF" fillOpacity={0.55} stroke={pal.main} strokeWidth={10} strokeLinejoin="round" />;
  }
  if (fill === 'striped' || fill === 'dotted') {
    return (
      <>
        <Path d={d} fill={pal.light} />
        <G clipPath={clip}>
          {fill === 'striped' ? (
            <Path d={STRIPES} stroke={pal.main} strokeWidth={7} />
          ) : (
            DOTS.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={5.5} fill={pal.main} />)
          )}
        </G>
        <Path d={d} fill="none" stroke={pal.dark} strokeWidth={5} strokeLinejoin="round" />
      </>
    );
  }
  return (
    <>
      <Path d={d} fill={`url(#g${uid})`} stroke={pal.dark} strokeWidth={5} strokeLinejoin="round" />
      <G clipPath={clip}>
        <Ellipse cx={38} cy={28} rx={24} ry={11} fill="#FFFFFF" opacity={0.38} />
      </G>
    </>
  );
}

function Poly({ shape, size, uid }: { shape: ShapeDesc; size: number; uid: string }) {
  const pal = SHAPE_PALETTE[shape.color];
  const cells = shape.cells ?? [];
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const cs = 92 / Math.max(w, h, 3);
  const ox = (100 - w * cs) / 2;
  const oy = (100 - h * cs) / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={pal.light} />
          <Stop offset="1" stopColor={pal.main} />
        </LinearGradient>
      </Defs>
      {cells.map(([x, y], i) => (
        <G key={i}>
          <Rect x={ox + x * cs + 1} y={oy + y * cs + 1} width={cs - 2} height={cs - 2} rx={cs * 0.2} fill={`url(#g${uid})`} stroke={pal.dark} strokeWidth={2.5} />
          <Rect x={ox + x * cs + cs * 0.18} y={oy + y * cs + cs * 0.14} width={cs * 0.4} height={cs * 0.16} rx={cs * 0.08} fill="#FFFFFF" opacity={0.45} />
        </G>
      ))}
    </Svg>
  );
}

export function Shape({ shape, size }: { shape: ShapeDesc; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (shape.kind === 'poly') return <Poly shape={shape} size={size} uid={uid} />;
  const pal = SHAPE_PALETTE[shape.color];
  const d = PATHS[shape.kind];
  const rot = visibleRotation(shape);
  const k = SIZE_SCALE[shape.size] * 0.94;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`g${uid}`} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor={pal.light} />
          <Stop offset="1" stopColor={pal.main} />
        </LinearGradient>
        <ClipPath id={`c${uid}`}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      {countLayout(shape.count).map(([x, y, s], i) => (
        <G key={i} transform={`translate(${x} ${y}) scale(${s * k}) rotate(${rot}) translate(-50 -50)`}>
          <Body d={d} fill={shape.fill} pal={pal} uid={uid} />
        </G>
      ))}
    </Svg>
  );
}
