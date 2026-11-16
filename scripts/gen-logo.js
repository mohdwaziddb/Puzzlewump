#!/usr/bin/env node
/**
 * Puzzlewump — title-screen logo generator (assets/images/ui/logo.webp, 800x715, transparent).
 * Mascot (assets/images/ui/brain.webp) + Fredoka Bold title converted to vector paths.
 *
 *   npm run gen:logo
 *
 * Needs devDependencies: sharp, opentype.js.
 */
'use strict';
const fs=require('fs');const path=require('path');
const R=path.join(__dirname,'..')+path.sep;
const sharp=require(R+'node_modules/sharp');const opentype=require(R+'node_modules/opentype.js');
const buf=fs.readFileSync(R+'node_modules/@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf');
const font=opentype.parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));
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
(async()=>{
  const W=800,H=715;
  // title text fitted to ~690px width
  let size=150,p,bb;
  do{p=font.getPath('Puzzlewump',0,0,size);bb=p.getBoundingBox();size-=2;}while(bb.x2-bb.x1>690);
  const tw=bb.x2-bb.x1;const x=Math.round((W-tw)/2-bb.x1);const base=470; // integer offsets: fractional ones can yield NaN in toPathData
  const t=pathData(font.getPath('Puzzlewump',x,base,size));
  const sub=font.getPath('Puzzle Adventure',0,0,50);const sb=sub.getBoundingBox();
  const sx=Math.round((W-(sb.x2-sb.x1))/2-sb.x1);const s=pathData(font.getPath('Puzzle Adventure',sx,623,50));
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
   <defs>
    <linearGradient id="ty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF08A"/><stop offset="0.5" stop-color="#FFD23F"/><stop offset="1" stop-color="#FF9F1C"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98A4B"/><stop offset="1" stop-color="#8A5128"/></linearGradient>
   </defs>
   <rect x="70" y="565" width="660" height="110" rx="26" fill="#4A2308"/>
   <rect x="78" y="570" width="644" height="98" rx="22" fill="url(#wood)" stroke="#5A2E0E" stroke-width="5"/>
   <path d="${s}" fill="#5A2E0E" stroke="#5A2E0E" stroke-width="8" stroke-linejoin="round" transform="translate(0 3)"/>
   <path d="${s}" fill="#FFF3D0"/>
   <path d="${t}" fill="#4A2308" stroke="#4A2308" stroke-width="26" stroke-linejoin="round" transform="translate(0 9)"/>
   <path d="${t}" fill="#7A3F12" stroke="#7A3F12" stroke-width="20" stroke-linejoin="round"/>
   <path d="${t}" fill="url(#ty)" stroke="none" stroke-linejoin="round"/>
   <g fill="#FFD23F"><path d="M95 150 l14 34 34 14 -34 14 -14 34 -14 -34 -34 -14 34 -14z"/><path d="M705 190 l12 28 28 12 -28 12 -12 28 -12 -28 -28 -12 28 -12z"/></g>
  </svg>`);
  const brain=await sharp(R+'assets/images/ui/brain.webp').resize(330,330).ensureAlpha().png().toBuffer();
  await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite([{input:brain,left:Math.round((W-330)/2),top:20},{input:svg,left:0,top:0}])
   .webp({quality:92,alphaQuality:100}).toFile(R+'assets/images/ui/logo.webp');
  console.log('Generated assets/images/ui/logo.webp');
})();
