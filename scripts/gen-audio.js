#!/usr/bin/env node
/**
 * Brain Quest — procedural audio generator.
 *
 * README: Every sound and music loop in assets/audio/ is ORIGINAL and generated
 * procedurally by this script (pure math: oscillators, noise, envelopes, filters).
 * No samples, recordings, downloads or third-party audio are used.
 *
 * Usage: node scripts/gen-audio.js   (no dependencies, deterministic output)
 * Output: 16-bit PCM mono WAV, 22050 Hz, into assets/audio/.
 *   SFX:   click correct wrong star coin unlock complete chest achievement flip pop whoosh
 *   Music: music_main music_memory music_number music_jungle music_logic music_treasure
 *          (seamless loops: note tails/echoes wrap around to the start of the buffer)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'audio');
const TAU = Math.PI * 2;

// ---------- utilities ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const dbToGain = (db) => Math.pow(10, db / 20);

/** Band-limited-ish waveforms (few harmonics => soft, cartoon-like, never harsh). */
function osc(wave, phase) {
  switch (wave) {
    case 'sine':
      return Math.sin(phase);
    case 'tri': // triangle: odd harmonics 1/n^2
      return (8 / (Math.PI * Math.PI)) *
        (Math.sin(phase) - Math.sin(3 * phase) / 9 + Math.sin(5 * phase) / 25 - Math.sin(7 * phase) / 49);
    case 'square': // soft square: odd harmonics up to 7
      return 0.8 * (Math.sin(phase) + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5 + Math.sin(7 * phase) / 7);
    case 'saw':
      return 0.6 * (Math.sin(phase) + Math.sin(2 * phase) / 2 + Math.sin(3 * phase) / 3 + Math.sin(4 * phase) / 4);
    default:
      return Math.sin(phase);
  }
}

class Buf {
  constructor(seconds, wrap = false) {
    this.len = Math.round(seconds * SR);
    this.d = new Float32Array(this.len);
    this.wrap = wrap; // music loops: write past the end wraps to the start (seamless loop)
  }
  add(i, v) {
    if (this.wrap) this.d[((i % this.len) + this.len) % this.len] += v;
    else if (i >= 0 && i < this.len) this.d[i] += v;
  }
}

/**
 * Tonal note with ADSR envelope.
 * opts: wave, vol, a, d, s, r, slide (semitones over note), vib (depth semis), vibRate, partials [[ratio, amp, decayMul]]
 */
function note(buf, t, dur, freq, o = {}) {
  const wave = o.wave || 'sine';
  const vol = o.vol == null ? 0.5 : o.vol;
  const a = Math.max(o.a == null ? 0.005 : o.a, 0.003);
  const d = o.d == null ? 0.1 : o.d;
  const s = o.s == null ? 0.7 : o.s;
  const r = Math.max(o.r == null ? 0.05 : o.r, 0.006);
  const pluck = o.pluck || 0; // exponential decay rate (per second), 0 = ADSR only
  const slide = o.slide || 0;
  const vib = o.vib || 0;
  const vibRate = o.vibRate || 5.5;
  const partials = o.partials || null;
  const total = dur + r;
  const n = Math.round(total * SR);
  const start = Math.round(t * SR);
  let ph = 0;
  const phs = partials ? partials.map(() => 0) : null;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    let env;
    if (tt < a) env = tt / a;
    else if (tt < a + d) env = 1 - (1 - s) * ((tt - a) / d);
    else env = s;
    if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / r);
    if (pluck) env *= Math.exp(-pluck * tt);
    // smooth start curve to avoid clicks
    env = env * env * (3 - 2 * env) * 0.5 + env * 0.5;
    const semis = slide * Math.min(1, tt / Math.max(dur, 0.001)) + (vib ? vib * Math.sin(TAU * vibRate * tt) * Math.min(1, tt / 0.15) : 0);
    const f = freq * Math.pow(2, semis / 12);
    ph += (TAU * f) / SR;
    let v = osc(wave, ph);
    if (partials) {
      for (let k = 0; k < partials.length; k++) {
        const [ratio, amp, dec] = partials[k];
        phs[k] += (TAU * f * ratio) / SR;
        v += amp * Math.sin(phs[k]) * Math.exp(-(dec || 0) * tt);
      }
    }
    buf.add(start + i, v * env * vol);
  }
}

/** Filtered noise burst. lp/hp: cutoff Hz (or function of normalized time 0..1 for sweeps). */
function noise(buf, t, dur, o = {}, rng) {
  const vol = o.vol == null ? 0.3 : o.vol;
  const a = Math.max(o.a == null ? 0.003 : o.a, 0.002);
  const decay = o.decay || 0; // exp decay rate
  const shape = o.shape || null; // custom env fn(x 0..1)
  const n = Math.round(dur * SR);
  const start = Math.round(t * SR);
  let lp1 = 0;
  let lp2 = 0;
  let hpState = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const tt = i / SR;
    const w = rng() * 2 - 1;
    const lpc = typeof o.lp === 'function' ? o.lp(x) : o.lp || 8000;
    const ca = 1 - Math.exp((-TAU * lpc) / SR);
    lp1 += ca * (w - lp1);
    lp2 += ca * (lp1 - lp2);
    let v = lp2;
    if (o.hp) {
      const hc = 1 - Math.exp((-TAU * o.hp) / SR);
      hpState += hc * (v - hpState);
      v = v - hpState;
    }
    let env = shape ? shape(x) : Math.min(1, tt / a) * (decay ? Math.exp(-decay * tt) : 1);
    env *= Math.min(1, (n - i) / (0.004 * SR)); // tiny fade-out, no click
    buf.add(start + i, v * env * vol);
  }
}

/** Pitch-dropping sine drum (kick / bongo / tom). */
function drum(buf, t, f0, f1, dur, vol) {
  const n = Math.round(dur * SR);
  const start = Math.round(t * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-tt * 30);
    ph += (TAU * f) / SR;
    const env = Math.min(1, tt / 0.002) * Math.exp((-tt * 5) / dur) * Math.min(1, (n - i) / (0.004 * SR));
    buf.add(start + i, Math.sin(ph) * env * vol);
  }
}

/** Circular (loop-safe) feedback echo. */
function echo(buf, delaySec, feedback, mix) {
  const dl = Math.round(delaySec * SR);
  const src = Float32Array.from(buf.d);
  const wet = new Float32Array(buf.len);
  // two passes around the loop so the echo tail is continuous across the loop point
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < buf.len; i++) {
      const j = (i - dl + buf.len) % buf.len;
      wet[i] = src[j] + wet[j] * feedback;
    }
  }
  for (let i = 0; i < buf.len; i++) buf.d[i] += wet[i] * mix;
}

function normalize(buf, peakDb) {
  let peak = 0;
  for (let i = 0; i < buf.len; i++) peak = Math.max(peak, Math.abs(buf.d[i]));
  if (peak === 0) return;
  const g = dbToGain(peakDb) / peak;
  for (let i = 0; i < buf.len; i++) buf.d[i] *= g;
}

/** Music: aim for a consistent soft loudness (RMS ~ -21 dBFS) without letting peaks exceed -4 dBFS. */
function normalizeMusic(buf) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < buf.len; i++) {
    peak = Math.max(peak, Math.abs(buf.d[i]));
    sum += buf.d[i] * buf.d[i];
  }
  const rms = Math.sqrt(sum / buf.len);
  if (!rms) return;
  const g = Math.min(dbToGain(-21) / rms, dbToGain(-4) / peak);
  for (let i = 0; i < buf.len; i++) buf.d[i] *= g;
}

function edgeFade(buf, ms = 4) {
  const n = Math.round((ms / 1000) * SR);
  for (let i = 0; i < n && i < buf.len; i++) {
    buf.d[i] *= i / n;
    buf.d[buf.len - 1 - i] *= i / n;
  }
}

function writeWav(name, buf) {
  const n = buf.len;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, buf.d[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name + '.wav'), b);
  return b.length;
}

// ---------- SFX ----------
const bell = [[2, 0.35, 6], [3, 0.12, 10], [4.2, 0.06, 14]];
const SFX = {
  click(rng) {
    const b = new Buf(0.09);
    note(b, 0, 0.03, 1100, { wave: 'sine', vol: 0.6, a: 0.002, d: 0.02, s: 0.3, r: 0.03, slide: -4 });
    noise(b, 0, 0.02, { vol: 0.15, lp: 5000, decay: 150 }, rng);
    return b;
  },
  correct() {
    const b = new Buf(0.75);
    [72, 76, 79, 84].forEach((m, i) =>
      note(b, i * 0.07, i === 3 ? 0.3 : 0.08, mtof(m), { wave: 'tri', vol: 0.45, a: 0.004, d: 0.1, s: 0.5, r: 0.25, pluck: 4, partials: bell }),
    );
    return b;
  },
  wrong() {
    const b = new Buf(0.6);
    note(b, 0, 0.14, mtof(60), { wave: 'sine', vol: 0.55, a: 0.01, d: 0.05, s: 0.8, r: 0.06, slide: -1, partials: [[2, 0.15, 5]] });
    note(b, 0.2, 0.2, mtof(55), { wave: 'sine', vol: 0.55, a: 0.01, d: 0.05, s: 0.8, r: 0.12, slide: -2, vib: 0.3, vibRate: 7, partials: [[2, 0.15, 5]] });
    return b;
  },
  star(rng) {
    const b = new Buf(0.8);
    note(b, 0, 0.1, mtof(91), { wave: 'sine', vol: 0.45, a: 0.003, r: 0.55, pluck: 6, partials: [[2.76, 0.25, 12], [5.4, 0.1, 20]] });
    for (let i = 0; i < 6; i++) {
      note(b, 0.04 + i * 0.06, 0.02, mtof(96 + Math.floor(rng() * 8)), { vol: 0.12, a: 0.002, r: 0.08, pluck: 20 });
    }
    return b;
  },
  coin() {
    const b = new Buf(0.5);
    note(b, 0, 0.07, mtof(83), { wave: 'square', vol: 0.28, a: 0.002, d: 0.02, s: 0.9, r: 0.01 });
    note(b, 0.075, 0.12, mtof(88), { wave: 'square', vol: 0.28, a: 0.002, d: 0.05, s: 0.8, r: 0.25, pluck: 5 });
    return b;
  },
  unlock(rng) {
    const b = new Buf(1.1);
    const seq = [72, 76, 79, 83, 84, 88, 91, 95, 96];
    seq.forEach((m, i) =>
      note(b, i * 0.055, 0.05, mtof(m), { wave: 'sine', vol: 0.3, a: 0.003, r: 0.4, pluck: 5, vib: 0.15, vibRate: 9, partials: bell }),
    );
    noise(b, 0, 0.9, { vol: 0.06, lp: 9000, hp: 4000, shape: (x) => Math.sin(Math.PI * x) }, rng);
    return b;
  },
  complete() {
    const b = new Buf(1.6);
    const lead = { wave: 'square', vol: 0.22, a: 0.005, d: 0.05, s: 0.7, r: 0.06 };
    note(b, 0.0, 0.1, mtof(67), lead);
    note(b, 0.12, 0.1, mtof(72), lead);
    note(b, 0.24, 0.1, mtof(76), lead);
    note(b, 0.36, 0.22, mtof(79), lead);
    note(b, 0.6, 0.1, mtof(76), lead);
    note(b, 0.72, 0.6, mtof(84), { ...lead, r: 0.25, vib: 0.2 });
    [72, 76, 79].forEach((m) => note(b, 0.72, 0.6, mtof(m), { wave: 'tri', vol: 0.15, a: 0.01, r: 0.25 }));
    note(b, 0.0, 0.3, mtof(48), { wave: 'tri', vol: 0.3, r: 0.05 });
    note(b, 0.36, 0.2, mtof(55), { wave: 'tri', vol: 0.3, r: 0.05 });
    note(b, 0.72, 0.6, mtof(48), { wave: 'tri', vol: 0.35, r: 0.25 });
    return b;
  },
  chest(rng) {
    const b = new Buf(1.1);
    // creak: low wobbling saw, gently filtered by low volume harmonics
    note(b, 0, 0.35, 140, { wave: 'saw', vol: 0.18, a: 0.03, d: 0.1, s: 0.8, r: 0.06, slide: 5, vib: 1.2, vibRate: 13 });
    noise(b, 0, 0.35, { vol: 0.05, lp: 1200, shape: (x) => Math.sin(Math.PI * x) }, rng);
    [84, 88, 91, 96].forEach((m, i) =>
      note(b, 0.38 + i * 0.06, 0.05, mtof(m), { wave: 'sine', vol: 0.3, a: 0.003, r: 0.4, pluck: 5, partials: bell }),
    );
    return b;
  },
  achievement() {
    const b = new Buf(1.2);
    [72, 76, 79, 84, 88].forEach((m, i) =>
      note(b, i * 0.065, 0.06, mtof(m), { wave: 'tri', vol: 0.35, a: 0.003, r: 0.15, pluck: 3, partials: bell }),
    );
    [84, 88, 91].forEach((m) => note(b, 0.36, 0.4, mtof(m), { wave: 'tri', vol: 0.2, a: 0.01, r: 0.35, pluck: 2, vib: 0.15 }));
    return b;
  },
  flip(rng) {
    const b = new Buf(0.12);
    noise(b, 0, 0.09, { vol: 0.45, lp: (x) => 2500 + 2500 * (1 - x), hp: 600, a: 0.004, decay: 35 }, rng);
    return b;
  },
  pop() {
    const b = new Buf(0.12);
    note(b, 0, 0.04, 380, { wave: 'sine', vol: 0.65, a: 0.002, d: 0.03, s: 0.4, r: 0.04, slide: 16 });
    return b;
  },
  whoosh(rng) {
    const b = new Buf(0.5);
    noise(b, 0, 0.45, { vol: 0.6, lp: (x) => 300 + 3200 * Math.sin(Math.PI * x), hp: 150, shape: (x) => Math.pow(Math.sin(Math.PI * x), 1.5) }, rng);
    return b;
  },
};

// ---------- Music ----------
const CHORD = { maj: [0, 4, 7], min: [0, 3, 7], sus: [0, 5, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** Deterministic melody: motif (bars 0-1) repeats at bars 4-5, last bar resolves to a long note. */
function genMelody(rng, song, rhythms, lo, hi) {
  const { chords, stepsPerBar, bars, key, scale } = song;
  const scaleNotes = [];
  for (let m = lo; m <= hi; m++) if (scale.includes((((m - key) % 12) + 12) % 12)) scaleNotes.push(m);
  const notes = [];
  const barRhythm = [];
  for (let bar = 0; bar < bars; bar++) {
    if (bar === bars - 1) barRhythm.push([[0, stepsPerBar / 2], [stepsPerBar / 2, stepsPerBar / 2 - 0.5]]);
    else if (bar >= 4 && bar - 4 < 2 && bars >= 8) barRhythm.push(barRhythm[bar - 4]);
    else barRhythm.push(rhythms[Math.floor(rng() * rhythms.length)]);
  }
  let prev = Math.round((lo + hi) / 2);
  for (let bar = 0; bar < bars; bar++) {
    const [root, type] = chords[bar];
    const ct = CHORD[type].map((x) => (root + x) % 12);
    for (const [st, len] of barRhythm[bar]) {
      const strong = st % (stepsPerBar / 2) === 0;
      const pool = scaleNotes.filter((m) => !strong || ct.includes(m % 12));
      const target = prev + Math.round((rng() * 2 - 1) * 4);
      let best = pool[0];
      for (const m of pool) if (Math.abs(m - target) < Math.abs(best - target) || (Math.abs(m - target) === Math.abs(best - target) && rng() < 0.5)) best = m;
      prev = best;
      notes.push({ step: bar * stepsPerBar + st, len, midi: best });
    }
  }
  return notes;
}

function songBuf(song) {
  return new Buf(song.stepDur * song.stepsPerBar * song.bars, true);
}
function chordTones(root, type, base) {
  return CHORD[type].map((x) => base + ((root - base) % 12 + 12) % 12 + x);
}

const SONGS = {
  // Adventurous, happy C major, 120 bpm (eighth = 0.25s), 8 bars = 16 s
  main(rng) {
    const song = { key: 0, scale: MAJOR, stepDur: 0.25, stepsPerBar: 8, bars: 8,
      chords: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj'], [5, 'maj'], [7, 'dom7']] };
    const b = songBuf(song);
    const S = song.stepDur;
    const rh = [[[0, 1], [1, 1], [2, 2], [4, 1], [5, 1], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 3], [7, 1]], [[0, 1.5], [1.5, 0.5], [2, 2], [4, 2], [6, 2]]];
    for (const n of genMelody(rng, song, rh, 67, 84)) note(b, n.step * S, n.len * S * 0.85, mtof(n.midi), { wave: 'square', vol: 0.18, a: 0.008, d: 0.08, s: 0.6, r: 0.06 });
    song.chords.forEach(([root, type], bar) => {
      const t0 = bar * 8 * S;
      const bassRoot = 36 + root;
      [0, 3, 4, 7].forEach((st, i) => note(b, t0 + st * S, S * (i % 2 ? 0.8 : 1.6), mtof(i === 2 ? bassRoot + 7 : bassRoot), { wave: 'tri', vol: 0.4, a: 0.006, r: 0.05 }));
      chordTones(root, type, 60).forEach((m) => [2, 6].forEach((st) => note(b, t0 + st * S, S * 0.6, mtof(m), { wave: 'tri', vol: 0.06, a: 0.01, r: 0.08 })));
      for (let st = 0; st < 8; st++) {
        if (st % 4 === 0) drum(b, t0 + st * S, 140, 50, 0.18, 0.45);
        if (st % 4 === 2) noise(b, t0 + st * S, 0.12, { vol: 0.12, lp: 4000, hp: 800, decay: 30 }, rng);
        noise(b, t0 + st * S, 0.04, { vol: 0.035, lp: 9000, hp: 6000, decay: 80 }, rng);
      }
    });
    return b;
  },
  // Fairy-tale music box, 3/4 waltz F major, eighth = 0.333s (90 bpm), 8 bars of 6 eighths = 16 s
  memory(rng) {
    const song = { key: 5, scale: MAJOR, stepDur: 1 / 3, stepsPerBar: 6, bars: 8,
      chords: [[5, 'maj'], [2, 'min'], [10, 'maj'], [0, 'maj'], [5, 'maj'], [9, 'min'], [10, 'maj'], [0, 'dom7']] };
    const b = songBuf(song);
    const S = song.stepDur;
    const box = { wave: 'sine', vol: 0.3, a: 0.003, r: 0.6, pluck: 3.5, partials: [[2, 0.3, 4], [3.01, 0.12, 8], [5.4, 0.05, 14]] };
    const rh = [[[0, 2], [2, 1], [3, 1], [4, 2]], [[0, 3], [3, 1], [4, 1], [5, 1]], [[0, 1], [1, 1], [2, 2], [4, 2]]];
    for (const n of genMelody(rng, song, rh, 77, 93)) note(b, n.step * S, Math.min(n.len * S, 0.3), mtof(n.midi), box);
    song.chords.forEach(([root, type], bar) => {
      const t0 = bar * 6 * S;
      note(b, t0, S * 1.8, mtof(41 + ((root - 5 + 12) % 12)), { wave: 'sine', vol: 0.35, a: 0.01, r: 0.3, pluck: 1.5 });
      const ct = chordTones(root, type, 65);
      [2, 4].forEach((st) => ct.slice(0, 3).forEach((m) => note(b, t0 + st * S, S * 0.5, mtof(m), { ...box, vol: 0.07 })));
    });
    echo(b, S * 1.5, 0.3, 0.25);
    return b;
  },
  // Spacey arpeggio, A minor, 120 bpm, 16th arpeggios + pad, 8 bars = 16 s
  number(rng) {
    const song = { key: 9, scale: MINOR, stepDur: 0.25, stepsPerBar: 8, bars: 8,
      chords: [[9, 'min7'], [5, 'maj7'], [0, 'maj'], [7, 'maj'], [9, 'min7'], [5, 'maj7'], [2, 'min7'], [4, 'maj']] };
    const b = songBuf(song);
    const S = song.stepDur;
    song.chords.forEach(([root, type], bar) => {
      const t0 = bar * 8 * S;
      const ct = chordTones(root, type, 57);
      const arp = [...ct, ...ct.map((m) => m + 12)];
      const order = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let k = 0; k < 16; k++) {
        const m = arp[order[k % 8] % arp.length];
        note(b, t0 + k * S * 0.5, S * 0.4, mtof(m + 12), { wave: 'tri', vol: 0.12, a: 0.004, r: 0.1, pluck: 6 });
      }
      ct.slice(0, 3).forEach((m) => {
        note(b, t0, 8 * S - 0.05, mtof(m), { wave: 'sine', vol: 0.06, a: 0.4, d: 0.5, s: 0.8, r: 0.4, vib: 0.08, vibRate: 0.7 });
        note(b, t0, 8 * S - 0.05, mtof(m) * 1.004, { wave: 'tri', vol: 0.04, a: 0.5, s: 0.8, r: 0.4 });
      });
      note(b, t0, S * 3.5, mtof(33 + ((root - 9 + 12) % 12)), { wave: 'sine', vol: 0.4, a: 0.01, r: 0.1, pluck: 0.6 });
      note(b, t0 + 4 * S, S * 3.5, mtof(33 + ((root - 9 + 12) % 12)), { wave: 'sine', vol: 0.35, a: 0.01, r: 0.1, pluck: 0.6 });
      for (let st = 0; st < 8; st++) {
        if (st % 4 === 0) drum(b, t0 + st * S, 120, 45, 0.2, 0.3);
        if (st % 2 === 1) noise(b, t0 + st * S, 0.05, { vol: 0.03, lp: 10000, hp: 7000, decay: 70 }, rng);
      }
    });
    const rh = [[[0, 4], [4, 2], [6, 2]], [[0, 3], [3, 3], [6, 2]]];
    for (const n of genMelody(rng, song, rh, 69, 84)) note(b, n.step * S, n.len * S * 0.9, mtof(n.midi), { wave: 'sine', vol: 0.13, a: 0.03, d: 0.2, s: 0.6, r: 0.2, vib: 0.2, vibRate: 5 });
    echo(b, S * 1.5, 0.35, 0.3);
    return b;
  },
  // Jungle: marimba + bongos + shaker, G major, 120 bpm, 8 bars = 16 s
  jungle(rng) {
    const song = { key: 7, scale: MAJOR, stepDur: 0.25, stepsPerBar: 8, bars: 8,
      chords: [[7, 'maj'], [0, 'maj'], [7, 'maj'], [2, 'maj'], [4, 'min'], [0, 'maj'], [2, 'sus'], [2, 'maj']] };
    const b = songBuf(song);
    const S = song.stepDur;
    const marimba = { wave: 'sine', vol: 0.3, a: 0.002, r: 0.25, pluck: 9, partials: [[4, 0.25, 40], [10, 0.05, 80]] };
    const rh = [[[0, 1], [1, 1], [3, 1], [4, 1], [6, 1], [7, 1]], [[0, 1], [2, 1], [3, 1], [4, 2], [6, 1]], [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2], [4, 1], [5, 1], [6, 2]]];
    for (const n of genMelody(rng, song, rh, 67, 86)) {
      note(b, n.step * S, 0.12, mtof(n.midi), marimba);
      if (n.len >= 2) note(b, (n.step + 0.5) * S, 0.12, mtof(n.midi), { ...marimba, vol: 0.18 }); // marimba roll feel
    }
    song.chords.forEach(([root], bar) => {
      const t0 = bar * 8 * S;
      const r = 43 + ((root - 7 + 12) % 12);
      [[0, r], [3, r + 7], [4, r + 12], [6, r + 7]].forEach(([st, m]) => note(b, t0 + st * S, 0.2, mtof(m), { ...marimba, vol: 0.32, pluck: 6 }));
      // bongos: hi/lo pattern
      [[0, 420], [1.5, 420], [2, 300], [3, 420], [4, 420], [5.5, 300], [6, 300], [7, 420]].forEach(([st, f]) => drum(b, t0 + st * S, f * 1.4, f, 0.12, 0.22));
      for (let k = 0; k < 16; k++) noise(b, t0 + k * S * 0.5, 0.06, { vol: k % 2 ? 0.03 : 0.05, lp: 9000, hp: 5000, a: 0.01, decay: 50 }, rng);
    });
    return b;
  },
  // Dreamy synth pads, D major, 90 bpm, 6 bars of 4/4 (2.667s) = 16 s
  logic(rng) {
    const song = { key: 2, scale: MAJOR, stepDur: 1 / 3, stepsPerBar: 8, bars: 6,
      chords: [[2, 'maj7'], [11, 'min7'], [7, 'maj7'], [9, 'sus'], [7, 'maj7'], [9, 'dom7']] };
    const b = songBuf(song);
    const S = song.stepDur;
    const barLen = 8 * S;
    song.chords.forEach(([root, type], bar) => {
      const t0 = bar * barLen;
      chordTones(root, type, 57).forEach((m, i) => {
        // pads overlap into next bar via release (wraps at loop end -> seamless)
        note(b, t0, barLen - 0.2, mtof(m), { wave: 'tri', vol: 0.07, a: 0.8, d: 0.5, s: 0.85, r: 0.9, vib: 0.06, vibRate: 0.5 + i * 0.1 });
        note(b, t0, barLen - 0.2, mtof(m) * 1.006, { wave: 'sine', vol: 0.06, a: 1.0, s: 0.85, r: 0.9 });
      });
      note(b, t0, barLen - 0.2, mtof(38 + ((root - 2 + 12) % 12)), { wave: 'sine', vol: 0.35, a: 0.2, s: 0.8, r: 0.6 });
      for (let st = 0; st < 8; st += 2) noise(b, t0 + st * S, 0.08, { vol: 0.02, lp: 9000, hp: 6000, decay: 40 }, rng);
    });
    const rh = [[[0, 3], [3, 1], [4, 4]], [[0, 2], [2, 2], [4, 2], [6, 2]], [[0, 4], [5, 3]]];
    for (const n of genMelody(rng, song, rh, 74, 90)) note(b, n.step * S, 0.2, mtof(n.midi), { wave: 'sine', vol: 0.18, a: 0.004, r: 0.8, pluck: 3, partials: bell });
    echo(b, S * 3, 0.4, 0.35);
    return b;
  },
  // Pirate shanty, bouncy 6/8 in D minor, eighth = 0.2222s, 12 bars = 16 s
  treasure(rng) {
    const song = { key: 2, scale: MINOR, stepDur: 16 / 72, stepsPerBar: 6, bars: 12,
      chords: [[2, 'min'], [2, 'min'], [0, 'maj'], [0, 'maj'], [2, 'min'], [10, 'maj'], [9, 'maj'], [9, 'maj'], [2, 'min'], [0, 'maj'], [9, 'maj'], [9, 'dom7']] };
    const b = songBuf(song);
    const S = song.stepDur;
    const rh = [[[0, 2], [2, 1], [3, 2], [5, 1]], [[0, 1], [1, 1], [2, 1], [3, 3]], [[0, 3], [3, 2], [5, 1]], [[0, 2], [2, 1], [3, 1], [4, 1], [5, 1]]];
    for (const n of genMelody(rng, song, rh, 62, 81)) {
      const o = { wave: 'square', vol: 0.12, a: 0.01, d: 0.06, s: 0.7, r: 0.05, vib: 0.12, vibRate: 6 };
      note(b, n.step * S, n.len * S * 0.8, mtof(n.midi), o);
      note(b, n.step * S, n.len * S * 0.8, mtof(n.midi) * 1.005, { ...o, wave: 'saw', vol: 0.05 }); // accordion-ish detune
    }
    song.chords.forEach(([root, type], bar) => {
      const t0 = bar * 6 * S;
      const r = 38 + ((root - 2 + 12) % 12);
      note(b, t0, S * 1.6, mtof(r), { wave: 'tri', vol: 0.42, a: 0.006, r: 0.05 });
      note(b, t0 + 3 * S, S * 1.6, mtof(r + 7), { wave: 'tri', vol: 0.38, a: 0.006, r: 0.05 });
      const ct = chordTones(root, type, 62).slice(0, 3);
      [1, 2, 4, 5].forEach((st) => ct.forEach((m) => note(b, t0 + st * S, S * 0.5, mtof(m), { wave: 'tri', vol: 0.045, a: 0.006, r: 0.04 })));
      drum(b, t0, 130, 50, 0.18, 0.4);
      drum(b, t0 + 3 * S, 130, 50, 0.18, 0.3);
      [1, 2, 4, 5].forEach((st) => noise(b, t0 + st * S, 0.05, { vol: 0.04, lp: 8000, hp: 4000, decay: 60 }, rng));
    });
    return b;
  },
};

// ---------- main ----------
// per-sound peak trims so dense tones (wrong/coin) are not louder than bells
const SFX_PEAK = { wrong: -9, coin: -8, pop: -7 };
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let total = 0;
  const rows = [];
  let seed = 1;
  for (const [name, fn] of Object.entries(SFX)) {
    const b = fn(mulberry32(seed++ * 7919));
    normalize(b, SFX_PEAK[name] || -5); // soft but clear
    edgeFade(b, 3);
    const bytes = writeWav(name, b);
    total += bytes;
    rows.push([name, (b.len / SR).toFixed(2) + 's', (bytes / 1024).toFixed(1) + ' KB']);
  }
  for (const [name, fn] of Object.entries(SONGS)) {
    const b = fn(mulberry32(seed++ * 104729));
    normalizeMusic(b); // soft background level; the app also plays music at reduced volume so SFX stand out
    // no edge fade: wrap-around rendering makes the loop point continuous
    const bytes = writeWav('music_' + name, b);
    total += bytes;
    rows.push(['music_' + name, (b.len / SR).toFixed(2) + 's', (bytes / 1024).toFixed(1) + ' KB']);
  }
  for (const r of rows) console.log(r[0].padEnd(16), r[1].padStart(7), r[2].padStart(10));
  console.log('TOTAL'.padEnd(16), ''.padStart(7), (total / 1024 / 1024).toFixed(2).padStart(7) + ' MB');
}

main();
