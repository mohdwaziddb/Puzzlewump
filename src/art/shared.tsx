/**
 * Shared helpers for the hand-crafted SVG art.
 *
 * Every component instance must use unique gradient ids (on web all SVG <defs> live in one
 * document, so two instances sharing "body" would clash). Use `useGid()`:
 *
 *   const g = useGid();
 *   <LinearGradient id={g('skin')} ...>  ...  fill={g.u('skin')}
 */
import React from 'react';
import { LinearGradient, RadialGradient, Stop } from 'react-native-svg';

export interface Gid {
  (name: string): string;
  /** url(#...) reference for a gradient id */
  u: (name: string) => string;
}

export function useGid(): Gid {
  const raw = React.useId();
  return React.useMemo(() => {
    const p = 'a' + raw.replace(/[^a-zA-Z0-9_-]/g, '');
    const f = ((name: string) => `${p}_${name}`) as Gid;
    f.u = (name: string) => `url(#${p}_${name})`;
    return f;
  }, [raw]);
}

/** Thick cartoon outline colour used across the art. */
export const INK = '#3A2412';

/** Vertical linear gradient from `top` to `bottom` (optional mid stop). */
export function VGrad({ id, top, bottom, mid, midAt = 0.5 }: { id: string; top: string; bottom: string; mid?: string; midAt?: number }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {mid
        ? [<Stop key="a" offset="0" stopColor={top} />, <Stop key="m" offset={String(midAt)} stopColor={mid} />, <Stop key="b" offset="1" stopColor={bottom} />]
        : [<Stop key="a" offset="0" stopColor={top} />, <Stop key="b" offset="1" stopColor={bottom} />]}
    </LinearGradient>
  );
}

/** Diagonal (top-left -> bottom-right) gradient. */
export function DGrad({ id, from, to, mid }: { id: string; from: string; to: string; mid?: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {mid
        ? [<Stop key="a" offset="0" stopColor={from} />, <Stop key="m" offset="0.5" stopColor={mid} />, <Stop key="b" offset="1" stopColor={to} />]
        : [<Stop key="a" offset="0" stopColor={from} />, <Stop key="b" offset="1" stopColor={to} />]}
    </LinearGradient>
  );
}

/** Soft 3D ball shading: light spot upper-left, dark edge. */
export function Ball({ id, light, base, dark, cx = 0.35, cy = 0.3 }: { id: string; light: string; base: string; dark: string; cx?: number; cy?: number }) {
  return (
    <RadialGradient id={id} cx={String(cx)} cy={String(cy)} r="0.8" fx={String(cx)} fy={String(cy)}>
      <Stop offset="0" stopColor={light} />
      <Stop offset="0.45" stopColor={base} />
      <Stop offset="1" stopColor={dark} />
    </RadialGradient>
  );
}

/** Radial glow fading to transparent. */
export function Glow({ id, color, opacity = 0.9 }: { id: string; color: string; opacity?: number }) {
  return (
    <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

/** 5-point star path centred at (cx,cy) with outer radius r. */
export function starPath(cx: number, cy: number, r: number, inner = 0.45, points = 5): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)} `;
  }
  return d + 'Z';
}

/** Small 4-point sparkle path. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const s = r * 0.22;
  return `M${cx} ${cy - r} Q${cx + s} ${cy - s} ${cx + r} ${cy} Q${cx + s} ${cy + s} ${cx} ${cy + r} Q${cx - s} ${cy + s} ${cx - r} ${cy} Q${cx - s} ${cy - s} ${cx} ${cy - r} Z`;
}

/** Deterministic pseudo-random generator (for star fields etc.). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Lighten (amt>0) or darken (amt<0) a #RRGGBB colour. amt in -1..1 */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
