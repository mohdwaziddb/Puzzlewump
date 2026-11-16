#!/usr/bin/env node
/**
 * Puzzlewump — app icon / splash / Play Store graphics generator.
 *
 * Everything is built from the game's own mascot art (assets/images/ui/brain.webp), so the
 * store icon matches what players see in the game. Re-run after changing the mascot or colors:
 *
 *   npm run gen:icons
 *
 * Output (assets/):
 *   icon.png                         1024x1024, opaque (iOS/App icon master, Expo "icon")
 *   android-icon-background.png      512x512 adaptive icon background (plain gradient, no guides)
 *   android-icon-foreground.png      512x512 adaptive icon foreground (mascot inside the 66% safe zone)
 *   android-icon-monochrome.png      432x432 Android 13 themed-icon silhouette
 *   splash-icon.png                  1024x1024 transparent (shown at imageWidth 200 on #5BC0F8)
 *   favicon.png                      48x48
 *   store/icon-512.png               Google Play "App icon" (512x512, 32-bit PNG)
 *   store/feature-graphic.png        Google Play "Feature graphic" (1024x500)
 *
 * Needs devDependencies: sharp, opentype.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const MASCOT = path.join(ASSETS, 'images', 'ui', 'brain.webp');
const FONT = path.join(ROOT, 'node_modules', '@expo-google-fonts', 'fredoka', '700Bold', 'Fredoka_700Bold.ttf');

const SKY_LIGHT = '#A6E3FF';
const SKY = '#5BC0F8';
const SKY_DEEP = '#2F95E6';

const font = (() => {
  const buf = fs.readFileSync(FONT);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
})();

const out = (...p) => path.join(ASSETS, ...p);

/** Radial sky gradient as an SVG, rendered by sharp. */
function gradientSvg(w, h) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><radialGradient id="g" cx="0.5" cy="0.38" r="0.85">
        <stop offset="0" stop-color="${SKY_LIGHT}"/><stop offset="0.55" stop-color="${SKY}"/><stop offset="1" stop-color="${SKY_DEEP}"/>
      </radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
    </svg>`,
  );
}

/**
 * Mascot with a cleaned edge. The source art has dark, semi-transparent edge pixels that show as a dotted
 * outline on light backgrounds, so the alpha is eroded by 1px. Also measures the artwork: its bounding-box
 * centre and the radius of the smallest circle (around that centre) that contains every opaque pixel.
 */
let mascotCache;
async function loadMascot() {
  if (mascotCache) return mascotCache;
  const { data, info } = await sharp(MASCOT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const px = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(w - 1, Math.max(0, x + dx)), ny = Math.min(h - 1, Math.max(0, y + dy));
          m = Math.min(m, data[(ny * w + nx) * 4 + 3]);
        }
      }
      px[(y * w + x) * 4 + 3] = m;
    }
  }
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cx = (minX + maxX + 1) / 2, cy = (minY + maxY + 1) / 2;
  let radius = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 40) radius = Math.max(radius, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }
  const png = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  mascotCache = { png, w, h, cx, cy, radius };
  return mascotCache;
}

/** Mascot scaled so every opaque pixel lies within `radiusPx` of its centre. offX/offY = that centre inside buf. */
async function fitMascot(radiusPx) {
  const m = await loadMascot();
  const scale = radiusPx / m.radius;
  const size = Math.round(m.w * scale);
  const buf = await sharp(m.png).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  return { buf, size, offX: m.cx * scale, offY: m.cy * scale };
}

/**
 * Clean one-colour silhouette of the mascot (source resolution) for the Android 13 themed icon: a solid shape
 * with only the large dark features (eyes, brows, mouth) cut out. Tiny dark specks between the brain folds
 * are ignored so the result stays crisp.
 */
async function silhouette() {
  const m = await loadMascot();
  const { data, info } = await sharp(m.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, n = w * h;
  const dark = new Uint8Array(n); // pupils, brows, mouth
  const white = new Uint8Array(n); // eye whites (gloves are excluded below by position)
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 75 || (r > 150 && g < 70 && b < 90)) dark[i] = 1;
    else if (lum > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 45) white[i] = 1;
  }
  const hole = new Uint8Array(n);
  /** Marks connected regions of `mask` (>= minSize px) as holes; `accept(cx, cy)` filters by centroid. */
  const collect = (mask, minSize, accept) => {
    const seen = new Uint8Array(n);
    for (let start = 0; start < n; start++) {
      if (!mask[start] || seen[start]) continue;
      const stack = [start], comp = [];
      seen[start] = 1;
      let sx = 0, sy = 0;
      while (stack.length) {
        const i = stack.pop();
        comp.push(i);
        const x = i % w, y = (i - x) / w;
        sx += x; sy += y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
        }
      }
      if (comp.length >= minSize && accept(sx / comp.length, sy / comp.length)) for (const i of comp) hole[i] = 1;
    }
  };
  const inFace = (x, y) => Math.hypot(x - m.cx, y - m.cy) < m.radius * 0.5; // central part of the brain only
  collect(dark, 120, () => true);
  collect(white, 150, inFace);
  // close the 1-2px gaps between pupil and eye white so each eye is one clean oval
  const closed = new Uint8Array(hole);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (hole[y * w + x]) continue;
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (hole[(y + dy) * w + x + dx]) c++;
      if (c >= 5) closed[y * w + x] = 1;
    }
  }
  const px = Buffer.alloc(n * 4); // black, alpha = shape
  for (let i = 0; i < n; i++) px[i * 4 + 3] = closed[i] ? 0 : data[i * 4 + 3];
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Soft drop shadow for a transparent PNG buffer. */
async function shadowOf(buf, size, opacity = 0.28) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(info.width * info.height * 4); // RGB stays 0 (black), alpha = mascot alpha * opacity
  for (let i = 0; i < info.width * info.height; i++) {
    px[i * 4 + 3] = Math.round(data[i * 4 + 3] * opacity);
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(Math.max(1, size * 0.025))
    .png()
    .toBuffer();
}

/** Layers (shadow + mascot) with the mascot's centre at (cx, cy) fractions of the canvas, inside `radiusPx`. */
async function mascotFit(radiusPx, canvasW, canvasH, cx = 0.5, cy = 0.5) {
  const f = await fitMascot(radiusPx);
  const left = Math.round(canvasW * cx - f.offX);
  const top = Math.round(canvasH * cy - f.offY);
  const shadow = await shadowOf(f.buf, f.size);
  const dy = Math.round(f.size * 0.03);
  return [
    { input: shadow, left, top: top + dy },
    { input: f.buf, left, top },
  ];
}

async function transparentCanvas(w, h, layers) {
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

/** SVG path string built from the glyph commands (opentype's toPathData can emit NaN). */
function pathData(p) {
  const n = (v) => {
    if (!Number.isFinite(v)) throw new Error('Invalid glyph coordinate');
    return v.toFixed(2);
  };
  return p.commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case 'Q':
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case 'C':
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        case 'Z':
          return 'Z';
        default:
          throw new Error('Unknown path command ' + c.type);
      }
    })
    .join('');
}

/** Text -> SVG path (so no system fonts are needed). Returns { d, width, height }. */
function textPath(text, fontSize, x, baselineY) {
  // integer offsets: fractional ones can yield NaN in toPathData
  const p = font.getPath(text, Math.round(x), Math.round(baselineY), fontSize);
  const bb = p.getBoundingBox();
  const d = pathData(p);
  return { d, width: bb.x2 - bb.x1, height: bb.y2 - bb.y1, bb };
}

async function main() {
  fs.mkdirSync(out('store'), { recursive: true });

  // 1. icon.png — opaque 1024
  {
    const W = 1024;
    const layers = await mascotFit(400, W, W);
    await sharp(gradientSvg(W, W)).composite(layers).flatten({ background: SKY }).removeAlpha().png().toFile(out('icon.png'));
  }

  // 2. adaptive icon background — plain gradient
  await sharp(gradientSvg(512, 512)).png().toFile(out('android-icon-background.png'));

  // 3. adaptive icon foreground — everything inside Android's 66dp safe circle (radius ≈156px of 512)
  {
    const W = 512;
    const layers = await mascotFit(146, W, W);
    await sharp(await transparentCanvas(W, W, layers)).toFile(out('android-icon-foreground.png'));
  }

  // 4. monochrome (themed icon) — solid silhouette, facial features cut out
  {
    const W = 432;
    const f = await fitMascot(120); // safe circle radius is 132px at 432px (4px per dp)
    const sil = await sharp(await silhouette()).resize(f.size, f.size, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp(await transparentCanvas(W, W, [{ input: sil, left: Math.round(W / 2 - f.offX), top: Math.round(W / 2 - f.offY) }])).toFile(out('android-icon-monochrome.png'));
  }

  // 5. splash — transparent, mascot centred. Android 12+ masks the splash icon with a circle of 2/3 of the
  //    canvas (radius ≈341px of 1024), so the whole mascot stays inside radius 320.
  {
    const W = 1024;
    const layers = await mascotFit(320, W, W);
    await sharp(await transparentCanvas(W, W, layers)).toFile(out('splash-icon.png'));
  }

  // 6. favicon
  await sharp(out('icon.png')).resize(48, 48).png().toFile(out('favicon.png'));

  // 7. Play Store icon 512
  await sharp(out('icon.png')).resize(512, 512).ensureAlpha().png().toFile(out('store', 'icon-512.png'));

  // 8. Play Store feature graphic 1024x500: mascot left, title right
  {
    const W = 1024, H = 500;
    const tx = 410;
    const maxTitleWidth = W - tx - 50; // keep the whole title inside the banner
    let titleSize = 120;
    while (textPath('Puzzlewump', titleSize, 0, 0).width > maxTitleWidth) titleSize -= 2;
    const titleBase = 255;
    const t = textPath('Puzzlewump', titleSize, tx, titleBase);
    const s = textPath('Puzzle Adventure', 46, tx + 6, titleBase + 78);
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <path d="${t.d}" fill="#5A2E0E" stroke="#5A2E0E" stroke-width="22" stroke-linejoin="round" transform="translate(0 6)"/>
        <path d="${t.d}" fill="#FFFFFF" stroke="#7A3F12" stroke-width="16" stroke-linejoin="round"/>
        <defs><linearGradient id="ty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE45C"/><stop offset="1" stop-color="#FFA81F"/></linearGradient></defs>
        <path d="${t.d}" fill="url(#ty)"/>
        <path d="${s.d}" fill="#FFFFFF" stroke="#1E6FB8" stroke-width="10" stroke-linejoin="round"/>
        <path d="${s.d}" fill="#FFFFFF"/>
      </svg>`,
    );
    const layers = await mascotFit(180, W, H, 0.2, 0.5);
    await sharp(gradientSvg(W, H))
      .composite([...layers, { input: svg, left: 0, top: 0 }])
      .removeAlpha()
      .png()
      .toFile(out('store', 'feature-graphic.png'));
  }

  console.log('Generated icons, splash and store graphics in', ASSETS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
