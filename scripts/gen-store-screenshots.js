#!/usr/bin/env node
/**
 * Puzzlewump — Google Play phone screenshots (1080x1920, 9:16) in a phone frame with a caption.
 *
 * Input: real screen captures of the app (1082x2402 PNG) in a folder, named as listed in SHOTS below.
 * Output: assets/store/screenshots/NN-name.png
 *
 *   node scripts/gen-store-screenshots.js <folder-with-captures>
 *
 * Needs devDependencies: sharp, opentype.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'store', 'screenshots');
const FONT = path.join(ROOT, 'node_modules', '@expo-google-fonts', 'fredoka', '700Bold', 'Fredoka_700Bold.ttf');
const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Usage: node scripts/gen-store-screenshots.js <folder-with-captures>');
  process.exit(1);
}

const SHOTS = [
  { file: '01-title.png', title: 'Puzzle Adventure', sub: '150 levels · offline · no ads', top: '#7FD3FF', bottom: '#2F95E6' },
  { file: '03-worlds.png', title: '5 Magical Worlds', sub: 'Castles, space, jungle & more', top: '#B9A2FF', bottom: '#6C4BD8' },
  { file: '09-memory-a.png', title: 'Train Your Memory', sub: 'Flip cards, find the pairs', top: '#C7A5FF', bottom: '#7B4FE0' },
  { file: '10-number-b.png', title: 'Fun With Numbers', sub: 'Patterns, sums & counting', top: '#6E7BFF', bottom: '#2B2F9E' },
  { file: '11-jungle-a.png', title: 'Plan Your Path', sub: 'Mazes in the Mystery Jungle', top: '#8EE58A', bottom: '#2E9E4F' },
  { file: '12-logic-a.png', title: 'Spot the Odd One', sub: 'Logic puzzles among the stars', top: '#5C7BFF', bottom: '#1F2A8A' },
  { file: '05-characters.png', title: 'Unlock Cute Heroes', sub: 'Play as Max, Mia, Coco or Robo', top: '#FFB86B', bottom: '#F0712B' },
  { file: '08-achievements.png', title: 'Earn Badges & Rewards', sub: 'Stars, coins and treasure chests', top: '#FFD86B', bottom: '#F0A21B' },
];

const W = 1080, H = 1920;
const font = (() => {
  const b = fs.readFileSync(FONT);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
})();

/** SVG path string from glyph commands (opentype's toPathData can emit NaN). */
function pathData(p) {
  const n = (v) => {
    if (!Number.isFinite(v)) throw new Error('Invalid glyph coordinate');
    return v.toFixed(2);
  };
  return p.commands.map((c) => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Z') return 'Z';
    throw new Error('Unknown path command ' + c.type);
  }).join('');
}

/** Centred text path fitted to maxWidth. */
function centredText(text, size, baseline, maxWidth) {
  let s = size;
  while (true) {
    const bb = font.getPath(text, 0, 0, s).getBoundingBox();
    if (bb.x2 - bb.x1 <= maxWidth || s <= 20) {
      const x = Math.round((W - (bb.x2 - bb.x1)) / 2 - bb.x1);
      return pathData(font.getPath(text, x, baseline, s));
    }
    s -= 2;
  }
}

async function build(shot, index) {
  // phone geometry
  const phoneH = 1500, screenRatio = 2402 / 1082;
  const bezel = 22;
  const screenH = phoneH - bezel * 2;
  const screenW = Math.round(screenH / screenRatio);
  const phoneW = screenW + bezel * 2;
  const px = Math.round((W - phoneW) / 2), py = 360;
  const r = 70, sr = r - bezel + 6;

  const title = centredText(shot.title, 104, 170, W - 120);
  const sub = centredText(shot.sub, 50, 258, W - 140);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shot.top}"/><stop offset="1" stop-color="${shot.bottom}"/></linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.15" r="0.6"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.35"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <circle cx="90" cy="420" r="10" fill="#fff" opacity="0.5"/><circle cx="990" cy="560" r="14" fill="#fff" opacity="0.4"/>
    <circle cx="70" cy="1500" r="16" fill="#fff" opacity="0.3"/><circle cx="1010" cy="1700" r="9" fill="#fff" opacity="0.45"/>
    <path d="${title}" fill="#3B1D06" stroke="#3B1D06" stroke-width="22" stroke-linejoin="round" transform="translate(0 7)"/>
    <path d="${title}" fill="#FFFFFF" stroke="#5A2E0E" stroke-width="14" stroke-linejoin="round"/>
    <path d="${title}" fill="#FFFFFF"/>
    <path d="${sub}" fill="#FFFFFF" opacity="0.95"/>
    <rect x="${px}" y="${py}" width="${phoneW}" height="${phoneH}" rx="${r}" fill="#1B2330" filter="url(#sh)"/>
    <rect x="${px + 4}" y="${py + 4}" width="${phoneW - 8}" height="${phoneH - 8}" rx="${r - 4}" fill="none" stroke="#3A4658" stroke-width="3"/>
  </svg>`);

  const screen = await sharp(path.join(SRC, shot.file)).resize(screenW, screenH, { fit: 'cover' }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${sr}" fill="#fff"/></svg>`);
  const roundedScreen = await sharp(screen).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

  const name = `${String(index + 1).padStart(2, '0')}-${path.basename(shot.file, '.png').replace(/^\d\d-/, '')}.png`;
  await sharp(bg)
    .composite([
      { input: roundedScreen, left: px + bezel, top: py + bezel },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
  return name;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (let i = 0; i < SHOTS.length; i++) console.log('wrote', await build(SHOTS[i], i));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
