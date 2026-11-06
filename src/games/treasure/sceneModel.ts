/**
 * Pure scene model for Treasure Island (no React).
 * A scene is a list of placed objects over a beach backdrop. Coordinates are normalized:
 *   x: 0..1 of scene width, y: 0..1 of scene height, size: fraction of scene WIDTH.
 * `aspect` = height / width. Distances are measured in "width units" (y is scaled by aspect)
 * so placement is the same no matter how big the scene is rendered.
 */
import type { Rng } from '@/engine/rng';
import type { ItemName } from '@/art/items';

/** Colour tweak: hue rotation (deg, Android/web) + brightness (all platforms). */
export interface Tint {
  hue: number;
  brightness: number;
}

export interface SceneObject {
  id: string;
  item: ItemName;
  x: number;
  y: number;
  size: number;
  rotation: number;
  flip: boolean;
  tint?: Tint;
}

export interface SceneData {
  aspect: number;
  objects: SceneObject[];
  /** backdrop variation (palm placement / time of day) */
  variant: number;
}

/* --------------------------------------------------------------- item pools */

export const SEA_ITEMS: ItemName[] = ['shell', 'anchor', 'compass', 'ship', 'parrot', 'crab', 'starfish', 'fish', 'turtle'];
export const TREASURE_ITEMS: ItemName[] = ['key', 'crown', 'gem', 'coinbag', 'bell'];
export const BEACH_ITEMS: ItemName[] = [
  ...SEA_ITEMS,
  ...TREASURE_ITEMS,
  'ball',
  'kite',
  'balloon',
  'umbrella',
  'hat',
  'drum',
  'book',
  'flower',
  'leaf',
  'mushroom',
  'banana',
  'apple',
  'orange',
  'watermelon',
  'monkey',
  'butterfly',
  'star',
  'cloud',
];
/** Items that look clearly different when mirrored. */
export const ASYMMETRIC_ITEMS: ItemName[] = [
  'fish', 'parrot', 'ship', 'key', 'banana', 'turtle', 'monkey', 'kite', 'leaf', 'cat', 'dog', 'rabbit', 'elephant', 'moon', 'comet', 'rocket',
];
/** Items that look the same when rotated (do not use for rotation differences). */
export const ROUND_ITEMS: ItemName[] = ['ball', 'sun', 'star', 'flower', 'starfish', 'orange', 'planet', 'gem', 'cloud', 'compass', 'watermelon'];

/* ---------------------------------------------------------------- geometry */

export function dist(a: { x: number; y: number }, b: { x: number; y: number }, aspect: number): number {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * aspect;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Minimum centre distance allowed between two objects (slight touching is fine). */
export function minGap(a: { size: number }, b: { size: number }, factor = 0.92): number {
  return ((a.size + b.size) / 2) * factor;
}

export interface PlaceOptions {
  aspect: number;
  /** y range allowed for centres (normalized). */
  yMin?: number;
  yMax?: number;
  gapFactor?: number;
  tries?: number;
}

/** Random free spot for an object of `size` that keeps the min gap to every `others`. */
export function findSpot(
  rng: Rng,
  size: number,
  others: readonly { x: number; y: number; size: number }[],
  opts: PlaceOptions,
): { x: number; y: number } | null {
  const { aspect, gapFactor = 0.92, tries = 160 } = opts;
  const half = size / 2;
  const yMin = Math.max(opts.yMin ?? 0.16, half / aspect + 0.01);
  const yMax = Math.min(opts.yMax ?? 0.95, 1 - half / aspect - 0.01);
  const xMin = half + 0.01;
  const xMax = 1 - half - 0.01;
  for (let t = 0; t < tries; t++) {
    const p = { x: xMin + rng.next() * (xMax - xMin), y: yMin + rng.next() * (yMax - yMin) };
    if (others.every((o) => dist(p, o, aspect) >= minGap({ size }, o, gapFactor))) return p;
  }
  return null;
}

export interface Spec {
  item: ItemName;
  size: number;
  rotation?: number;
  flip?: boolean;
  tint?: Tint;
}

/**
 * Place every spec with min-distance retry. If it cannot fit, everything shrinks a bit and
 * it tries again (deterministic for a given rng state).
 */
export function placeAll(rng: Rng, specs: readonly Spec[], opts: PlaceOptions, idPrefix = 'o'): SceneObject[] {
  let scale = 1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const out: SceneObject[] = [];
    let ok = true;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const size = s.size * scale;
      const p = findSpot(rng, size, out, opts);
      if (!p) {
        ok = false;
        break;
      }
      out.push({
        id: `${idPrefix}${i}`,
        item: s.item,
        x: p.x,
        y: p.y,
        size,
        rotation: s.rotation ?? 0,
        flip: s.flip ?? false,
        tint: s.tint,
      });
    }
    if (ok) return out;
    scale *= 0.92;
  }
  throw new Error('placeAll: could not fit scene');
}

/** True when no two objects overlap more than allowed. */
export function wellSpaced(objects: readonly SceneObject[], aspect: number, factor = 0.9): boolean {
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++)
      if (dist(objects[i], objects[j], aspect) < minGap(objects[i], objects[j], factor) - 1e-9) return false;
  return true;
}

/** Hit radius of an object in px for a scene rendered `sceneW` px wide (always >= minPx). */
export function hitRadiusPx(o: { size: number }, sceneW: number, minPx = 24): number {
  return Math.max(o.size * sceneW * 0.55, minPx);
}

/**
 * Nearest object under a tap (px coordinates inside a scene of sceneW x sceneW*aspect).
 * Returns null when the tap is outside every hit radius.
 */
export function hitTest<T extends { x: number; y: number; size: number }>(
  objects: readonly T[],
  px: number,
  py: number,
  sceneW: number,
  aspect: number,
  minPx = 24,
): T | null {
  const sceneH = sceneW * aspect;
  let best: T | null = null;
  let bestD = Infinity;
  for (const o of objects) {
    const d = Math.hypot(o.x * sceneW - px, o.y * sceneH - py);
    if (d <= hitRadiusPx(o, sceneW, minPx) && d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

/** Distance in px from a tap to the closest object edge-ish centre. */
export function nearestDistancePx(objects: readonly { x: number; y: number }[], px: number, py: number, sceneW: number, aspect: number): number {
  const sceneH = sceneW * aspect;
  let best = Infinity;
  for (const o of objects) best = Math.min(best, Math.hypot(o.x * sceneW - px, o.y * sceneH - py));
  return best;
}

/** Scene size that fits a box while keeping the aspect ratio. */
export function fitScene(aspect: number, maxW: number, maxH: number): { w: number; h: number } {
  const w = Math.max(80, Math.min(maxW, maxH / aspect));
  return { w: Math.floor(w), h: Math.floor(w * aspect) };
}
