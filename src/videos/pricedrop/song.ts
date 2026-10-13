import {bar, bars, cat, chord, drums, hits} from '../song/helpers.ts';
import type {TemplateSong} from '../song/fit.ts';

// Tech house in D mixolydian. Chords: D9 / G6 / Am7, rootless; the bass plays the roots.
// Hook = organ stab rhythm + delay echoes. Cue hits sit on every quarter step; the final hit is step 60.
const D9 = ['F#3', 'A3', 'C4', 'E4'];
const G6 = ['G3', 'B3', 'D4', 'E4'];
const AM7 = ['A3', 'C4', 'E4', 'G4'];
const FINAL = 60;

const keys = cat(
  // bar 0: impact(0), pluck headline(8), push into G6 at 14
  hits(0, [[0, 2, D9, 0.8], [6, 1, D9, 0.5], [8, 2, D9, 0.7], [10, 1, D9, 0.5], [14, 2, G6, 0.6]]),
  // bar 1: snap(16), price stab(20), priceBar pluck(24), push back to D9 at 30
  hits(1, [[0, 1.5, G6, 0.65], [4, 2, G6, 0.9], [6, 1, G6, 0.5], [8, 2, G6, 0.5], [10, 1, G6, 0.45], [14, 2, D9, 0.6]]),
  // bar 2: slab(32), flood(36), finale headline(40), cta stamp(44), push to Am7 at 46
  hits(2, [[0, 2, D9, 0.7], [4, 2, D9, 0.8], [6, 1, D9, 0.5], [8, 2, D9, 0.7], [10, 1, D9, 0.5], [12, 2, D9, 1.0], [14, 2, AM7, 0.6]]),
  // bar 3: rule(48), then a final unrolled D chord on the last cue
  hits(3, [[0, 2, AM7, 0.6], [4, 1.5, AM7, 0.45], [6, 1, AM7, 0.5], [8, 2, AM7, 0.55], [10, 1, AM7, 0.5]]),
  chord(3, 12, 3.5, ['F#3', 'A3', 'C4', 'E4', 'D5'], 1.0),
);

function bl(b: number, r: string, o: string, push: string) {
  return bar(b, [[2, 1, r, 1], [6, 1, r, 0.85], [7, 0.5, o, 0.6], [10, 1, r, 0.95], [14, 2, push, 0.85]]);
}
const bass = cat(
  [[0, 1.5, 'D2', 1]],
  bl(0, 'D2', 'D3', 'G1'),
  bl(1, 'G1', 'G2', 'D2'),
  bl(2, 'D2', 'D3', 'A1'),
  bar(3, [[2, 1, 'A1', 1], [6, 1, 'A1', 0.85], [7, 0.5, 'A2', 0.6], [10, 1, 'A1', 0.95]]),
  [[FINAL, 4, 'D2', 1]],
);

const pad = cat(
  chord(3, 0, 12, ['A3', 'E4', 'G4', 'C5'], 0.8),
  chord(3, 12, 3.5, ['A3', 'E4', 'F#4', 'C5'], 0.8, {att: 0.015}),
);

const song: TemplateSong = {
  id: 'pricedrop',
  title: 'Price Drop',
  genre: 'tech house',
  key: 'D mixolydian',
  scale: [2, 4, 6, 7, 9, 11, 0],
  finalStep: FINAL,
  seed: 77,
  swing: 0.1,
  fade: 0.3,
  duckRel: 0.14,
  retDuck: 0.35,
  sections: [['Groove', 0, 3], ['Drop', 3, 4]],
  delay: {steps: 3, fb: 0.38, lp: 4200, hp: 400, gain: 1, toRev: 0.2},
  reverb: {size: 0.8, decay: 1.5, damp: 6000, predelay: 0.015, hp: 250, lp: 9500, gain: 1},
  master: {
    eq: [['ls', 80, 0.7, 0.5], ['peak', 2800, 0.7, 1.5]],
    comp: {thr: -12, ratio: 2, att: 0.015, rel: 0.12, knee: 6},
    sat: 1.2,
  },
  parts: [
    {name: 'kick', inst: 'kick', pk: 0, notes: drums(bars(0, 4), 'X...X...X...X...'),
      p: {f0: 230, f1: 55, pd: 0.026, hold: 0.012, dec: 0.11, click: 0.3, drive: 2.0, knock: 0.22, len: 0.4}},
    {name: 'clap', inst: 'clap', lu: -8, rev: 0.22, hum: 0.002, fx: [['drive', 1.8]],
      notes: cat(drums(bars(0, 4), '....9.......9...'), [[56, 1, null, 0.6]]),
      p: {fc: 1600, q: 1.1, dec: 0.11, hp: 700}},
    {name: 'snap', inst: 'rim', lu: -12, rev: 0.15, notes: [[16, 1, null, 0.9], [52, 1, null, 0.6]], p: {pan: 0.3}},
    {name: 'snare', inst: 'snare', lu: -11, rev: 0.2,
      notes: [[16, 1, null, 0.6], [34, 1, null, 0.45], [35, 1, null, 0.6], [52, 1, null, 0.4]],
      p: {f: 220, ndec: 0.1}},
    {name: 'hatC', inst: 'hat', lu: -17, swing: true, hum: 0.002, vrand: 0.12,
      notes: cat(drums(bars(0, 3), '3363336333633363'), drums([3], '336333633363....')),
      p: {dec: 0.03, bp: 9000, hp: 7000, pan: 0.15, metal: 0.4, noise: 0.6}},
    {name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.1, swing: true, notes: drums([3], '..7...7...7.....', 1.2),
      p: {dec: 0.17, bp: 8000, hp: 5500, pan: -0.12, metal: 0.45, noise: 0.5, lp: 11000}},
    {name: 'ride', inst: 'ride', lu: -20, notes: drums([3], '5.6.5.6.5.......'), p: {dec: 0.4, base: 340, pan: 0.3}},
    {name: 'toms', inst: 'drum', lu: -10, rev: 0.2,
      notes: [[28, 1, 'A3', 0.6, {pan: 0.3}], [32, 1, 'D3', 0.7, {pan: -0.3}]],
      p: {dec: 0.2, bend: 0.4, bendT: 0.02, slap: 0.25, slapF: 1800, drive: 1.4}},
    {name: 'bass', inst: 'mono', lu: -3, duck: 0.55, swing: true, role: 'bass', notes: bass,
      p: {saw: 0.3, sub: 1, cut: 300, envOct: 2.2, envDec: 0.05, res: 0.2, att: 0.002, adec: 0.12, sus: 0.55, rel: 0.02, drive: 2, glide: 0.02, hp: 30}},
    {name: 'keys', inst: 'organ', lu: -4.5, dly: 0.24, rev: 0.18, duck: 0.35, swing: true, role: 'chords', notes: keys,
      p: {dec: 0.3, sus: 0.22, rel: 0.06, click: 0.2, spread: 0.6},
      fx: [['lpAuto', [[0, 1500], [2.8, 2400], [4.2, 3600], [6.5, 4000], [6.99, 4200], [7.0, 8000]], 0.7],
        ['hp', 200], ['chorus', {rate: 0.7, depth: 0.002, delay: 0.01, mix: 0.3}], ['drive', 1.3]]},
    {name: 'blip', inst: 'fmpluck', lu: -9, rev: 0.25, dly: 0.2,
      notes: [[4, 1, 'A4', 0.6], [12, 1, 'C5', 0.6]], p: {dec: 0.2, idx: 1.2}},
    {name: 'pad', inst: 'pad', lu: -12, rev: 0.5, duck: 0.55, duckRel: 0.25, role: 'chords', notes: pad,
      p: {voices: 5, det: 12, width: 0.9, cut: 1600, q: 0.6, att: 0.3, rel: 0.5},
      fx: [['hp', 200], ['chorus', {rate: 0.3, depth: 0.004, delay: 0.015, mix: 0.4}]]},
    {name: 'riser', inst: 'riser', lu: -14, rev: 0.3, notes: [[24, 12, null, 0.8]], p: {f0: 600, f1: 8000, q: 2}},
    {name: 'crash', inst: 'crash', lu: -15, rev: 0.25,
      notes: [[0, 1, null, 0.8], [36, 1, null, 0.8], [44, 1, null, 1.0], [48, 1, null, 0.7], [FINAL, 1, null, 0.7]],
      p: {dec: 1.0}},
    {name: 'boom', inst: 'boom', pk: -6,
      notes: [[0, 1, 'D2', 0.8], [36, 1, 'D2', 0.6], [44, 1, 'D2', 1.0], [FINAL, 1, 'D2', 0.7]],
      p: {dec: 0.6}},
  ],
  items: {
    inst: 'fmpluck', lu: -8, rev: 0.25, dly: 0.2, steps: 2, velocity: 0.85,
    pitches: ['F#4', 'A4', 'C5', 'E5', 'F#5', 'A5'],
    p: {dec: 0.2, idx: 1.2},
  },
};
export default song;
