import {bar, bars, cat, chord, drums, hits} from '../song/helpers.ts';
import type {TemplateSong} from '../song/fit.ts';

// Chord pulse voicings (E minor: E F# G A B C D). Only G and B are held between Em, Cmaj7 and D6 in the pad.
const EM = ['E4', 'G4', 'B4'];
const CM = ['E4', 'G4', 'C5'];
const DM = ['D4', 'F#4', 'B4'];

// Bar 0-1: pickup groove. The hook is the 3-3-2-3-3-2 rhythm. Cue steps: headline 0, subhead 8.
const pulseIntro = cat(
  hits(0, [[0, 1.5, EM, 0.7], [3, 1.5, EM, 0.6], [6, 1.5, EM, 0.7], [8, 1.5, EM, 0.55], [11, 1.5, EM, 0.65], [14, 1.5, EM, 0.6]]),
  hits(1, [[0, 1.5, CM, 0.85], [3, 1.5, CM, 0.65], [6, 1.5, CM, 0.75], [8, 1.5, DM, 0.7], [11, 1.5, DM, 0.7], [14, 1.5, EM, 0.75]]),
);
// Bar 2-3: thinned so the list items stay clear. Peak cue is step 54 (bar 3, step 6).
const pulseChart = cat(
  hits(2, [[0, 1.5, EM, 0.9], [3, 1.5, EM, 0.7], [6, 1.5, EM, 0.8]]),
  hits(3, [[0, 1.5, CM, 0.75], [6, 2, CM, 0.72], [8, 1.5, DM, 0.7], [11, 1.5, DM, 0.75], [14, 1.5, DM, 0.8]]),
);
// Final hit on step 64 (brand + attribution cues): one solid, unrolled chord that is held.
const pluck = cat(pulseIntro, pulseChart, chord(4, 0, 12, EM, 0.95));

const pad = chord(4, 0, 14, ['E3', 'B3', 'D4', 'F#4'], 0.9, {att: 0.015});

// Rolling 16th bass on the non-kick steps, energy 2 onward.
function roll(b: number, root: string, from = 0, to = 16) {
  const o = [];
  for (let s = from; s < to; s++) if (s % 4) o.push([b * 16 + s, 0.75, root, s % 4 === 2 ? 0.9 : s % 4 === 1 ? 0.65 : 0.75] as [number, number, string, number]);
  return o;
}
const bassNotes = cat(roll(2, 'E1'), roll(3, 'C2', 0, 8), roll(3, 'D2', 8, 16), [[64, 12, 'E1', 1]]);

const song: TemplateSong = {
  id: 'barchart',
  title: 'Barchart',
  genre: 'melodic techno',
  key: 'E minor',
  scale: [4, 6, 7, 9, 11, 0, 2],
  finalStep: 64,
  seed: 77,
  swing: 0,
  fade: 0.3,
  duckRel: 0.2,
  sections: [['Groove', 0, 2], ['Build', 2, 4], ['Drop', 4, 5]],
  delay: {steps: 3, fb: 0.42, lp: 3500, hp: 450, gain: 1, toRev: 0.35},
  reverb: {size: 1.2, decay: 2.8, damp: 4800, predelay: 0.03, hp: 230, lp: 8000, gain: 1},
  retDuck: 0.45,
  master: {
    eq: [['ls', 70, 0.7, 0.5], ['peak', 2800, 0.7, 1.0]],
    comp: {thr: -12, ratio: 2, att: 0.02, rel: 0.15, knee: 6},
    sat: 1.15,
  },
  parts: [
    {name: 'kick', inst: 'kick', pk: 0,
      notes: cat(drums(bars(0, 3), 'X...X...X...X...'), drums([3], 'X...X...........'), [[64, 1, null, 1]]),
      p: {f0: 185, f1: 55, pd: 0.042, hold: 0.015, dec: 0.15, click: 0.2, drive: 1.7, knock: 0.12, len: 0.5}},
    {name: 'clap', inst: 'clap', lu: -9.5, rev: 0.4, fx: [['drive', 1.6]],
      notes: cat(bar(2, [[2, 1, null, 0.7], [12, 1, null, 0.9]]), drums([3], '....9.......9...')),
      p: {fc: 1300, q: 0.9, dec: 0.16, hp: 550}},
    {name: 'hatOff', inst: 'hat', lu: -16, rev: 0.1, vrand: 0.08,
      notes: drums(bars(0, 4), '..7...7...7...7.'),
      p: {dec: 0.07, bp: 8000, hp: 6000, pan: 0.1, metal: 0.4, noise: 0.5, lp: 11500}},
    {name: 'hat16', inst: 'hat', lu: -21, vrand: 0.15,
      notes: drums([2, 3], '.3.3.3.3.3.3.3.3'),
      p: {dec: 0.025, bp: 10000, hp: 7500, pan: -0.2, metal: 0.3, noise: 0.6}},
    {name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.12, notes: [[64, 3, null, 0.8]],
      p: {dec: 0.17, bp: 8000, hp: 5500, pan: -0.1, metal: 0.45, noise: 0.5, lp: 11000}},
    {name: 'ride', inst: 'ride', lu: -20, notes: [[64, 1, null, 0.6]], p: {dec: 0.8, base: 340, pan: 0.3}},
    {name: 'bass', inst: 'mono', lu: -4.5, duck: 0.6, duckRel: 0.12, role: 'bass', notes: bassNotes,
      p: {saw: 0.8, sub: 0.7, cut: 150, envOct: 2.6, envDec: 0.05, res: 0.3, att: 0.002, adec: 0.1, sus: 0.4, rel: 0.02, drive: 1.7, hp: 30}},
    {name: 'pad', inst: 'pad', lu: -10, rev: 0.5, duck: 0.75, duckRel: 0.22, role: 'chords', notes: pad,
      p: {voices: 7, det: 18, width: 1, cut: 2300, q: 0.7, att: 0.25, rel: 0.5},
      fx: [['hp', 150], ['chorus', {rate: 0.25, depth: 0.004, delay: 0.016, mix: 0.4}]]},
    {name: 'pluck', inst: 'pluck', lu: -5, dly: 0.32, rev: 0.32, duck: 0.3, role: 'chords', notes: pluck,
      p: {det: 8, sq: 0.15, cut: [[0, 700], [3.73, 1500], [7.4, 3600]], envOct: 2, envDec: 0.07, q: 1, dec: 0.2, rel: 0.06, spread: 0.6},
      fx: [['hp', 220], ['chorus', {rate: 0.4, depth: 0.002, delay: 0.012, mix: 0.3}]]},
    {name: 'riser', inst: 'riser', lu: -11, rev: 0.4, notes: [[56, 8, null, 1]],
      p: {f0: 400, f1: 9000, q: 2.2, curve: 1.4, shape: 2.2}},
    {name: 'crash', inst: 'crash', lu: -14, rev: 0.3, notes: [[64, 1, null, 0.9]], p: {dec: 1.4}},
    {name: 'boom', inst: 'boom', pk: -5, notes: [[64, 1, 'E1', 0.9]], p: {dec: 0.9}},
  ],
  delay_note: undefined,
  items: {
    inst: 'fmpluck', lu: -7, rev: 0.3, dly: 0.2, duck: 0.1,
    pitches: ['G4', 'B4', 'E5', 'G5'],
    steps: 2, velocity: 0.85,
    p: {ratio: 2, idx: 1.5, idec: 0.08, dec: 0.25, sub: 0.2},
    fx: [['hp', 300]],
  },
} as TemplateSong;
export default song;
