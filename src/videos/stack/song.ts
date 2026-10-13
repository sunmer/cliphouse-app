import {bar, bars, cat, chord, drums, hits} from '../song/helpers.ts';
import type {TemplateSong} from '../song/fit.ts';

// Two-chord vamp, rootless voicings (the bass plays the roots). Dm9 -> Bbmaj7 keeps F and A in common.
const DM9 = ['F3', 'A3', 'C4', 'E4'];
const BBM7 = ['Bb3', 'D4', 'F4', 'A4'];

// Stab hook, straight 16ths, no swing. Bar 0 = title, bars 1-2 = list, bar 3 = lockup.
// Cue steps with a voice hit: 4 (single tone), 8 (stab), 50 (stab), 62 (full chord).
const keys = cat(
  hits(0, [[0, 2, DM9, 0.8], [4, 1, ['F4'], 0.6], [8, 2, DM9, 0.7], [11, 1, DM9, 0.55], [14, 2, BBM7, 0.7]]),
  hits(1, [[0, 2, BBM7, 0.85], [3, 1, BBM7, 0.65], [6, 1, BBM7, 0.75], [10, 2, BBM7, 0.7], [14, 2, DM9, 0.75]]),
  hits(2, [[0, 2, DM9, 0.85], [3, 1, DM9, 0.65], [6, 1, DM9, 0.75], [10, 2, DM9, 0.65]]),
  hits(3, [[0, 2, DM9, 0.95], [2, 1, DM9, 0.7], [4, 2, DM9, 1], [8, 2, BBM7, 0.85], [11, 1, BBM7, 0.7]]),
  // closing hit on step 62: unrolled tonic chord
  chord(3, 14, 2, ['D3', 'F3', 'A3', 'C4', 'E4'], 0.95)
);

const pad = cat(
  chord(3, 0, 8, ['D3', 'F3', 'A3', 'E4'], 0.8),
  chord(3, 8, 5.5, ['Bb2', 'F3', 'A3', 'D4'], 0.8),
  chord(3, 14, 2, ['D3', 'A3', 'C4', 'F4'], 0.8, {att: 0.015})
);

// Short, resonant mono bass: locks with the broken kick and fills the gaps.
const bass = cat(
  bar(1, [[0, 1, 'Bb1', 1], [3, 0.75, 'Bb1', 0.7], [7, 0.75, 'F2', 0.65], [10, 1, 'Bb1', 0.9], [13, 0.75, 'D2', 0.7]]),
  bar(2, [[0, 1, 'D2', 1], [3, 0.75, 'D2', 0.7], [7, 0.75, 'A2', 0.65], [10, 1, 'D2', 0.9]]),
  bar(3, [[0, 1, 'D2', 1], [3, 0.75, 'D2', 0.7], [4, 1, 'D2', 0.9], [6, 0.75, 'A1', 0.7],
    [8, 1, 'Bb1', 1], [10, 1, 'Bb1', 0.9], [13, 0.75, 'F2', 0.7], [14, 1.5, 'D2', 1]])
);

const song: TemplateSong = {
  id: 'stack',
  title: 'Stack',
  genre: 'electro breaks',
  key: 'D minor',
  scale: [2, 4, 5, 7, 9, 10, 0],
  finalStep: 62,
  seed: 88,
  swing: 0,
  fade: 0.08,
  duckRel: 0.12,
  sections: [['Pickup', 0, 1], ['Groove', 1, 3], ['Drop', 3, 4]],
  delay: {steps: 2, fb: 0.32, lp: 3000, hp: 450, gain: 1, toRev: 0.25},
  reverb: {size: 0.8, decay: 1.5, damp: 5000, predelay: 0.015, hp: 250, lp: 8500, gain: 1},
  retDuck: 0.4,
  master: {
    eq: [['ls', 80, 0.7, 0.5], ['peak', 300, 0.8, -1], ['peak', 3000, 0.7, 1.5]],
    comp: {thr: -12, ratio: 2, att: 0.015, rel: 0.12, knee: 6},
    sat: 1.2
  },
  parts: [
    // Broken kick: 0, 3, 6, 10, 13 (the ghost notes are quieter). Bar 3 adds the stamp on 4 and the closing hit on 14.
    {name: 'kick', inst: 'kick', pk: 0,
      notes: cat(
        drums([0], '8..5..7...7..5..'),
        drums([1], 'X..6..X...X..6..'),
        drums([2], 'X..6..X...X.....'),
        drums([3], 'X..6X.6...X..6X.')
      ),
      p: {f0: 200, f1: 73, pd: 0.03, hold: 0.012, dec: 0.12, click: 0.25, drive: 2.0, knock: 0.15, len: 0.25}},
    {name: 'tom', inst: 'drum', lu: -10, rev: 0.2, notes: [[12, 1, 'A2', 0.6, {pan: 0.2}]],
      p: {dec: 0.2, bend: 0.4, bendT: 0.025, slap: 0.2, slapF: 1500, drive: 1.4}},
    // Dry snare on 2 and 4 from the list onward; step 16 is the snap cue; short roll into the flood.
    {name: 'snare', inst: 'snare', lu: -8, rev: 0.04, hum: 0.002, fx: [['drive', 1.5]],
      notes: cat(
        [[16, 1, null, 0.8]],
        drums([1, 2, 3], '....9.......9...'),
        bar(2, [[13, 1, null, 0.45], [14, 1, null, 0.6], [15, 1, null, 0.8]]),
        [[62, 1, null, 0.9]]
      ),
      p: {f: 220, body: 0.6, bdec: 0.07, ndec: 0.1, nhp: 1400, nlp: 6000}},
    {name: 'hatC', inst: 'hat', lu: -17, vrand: 0.1,
      notes: cat(
        drums([0, 1, 2], '5.3.5.3.5.3.5.3.'),
        drums([3], '5.3.5.3.5.3.5...')
      ),
      p: {dec: 0.03, bp: 8500, hp: 6500, pan: -0.15, metal: 0.45, noise: 0.6}},
    {name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.08, notes: drums([3], '..7...7...7.....', 1.5),
      p: {dec: 0.17, bp: 8000, hp: 5500, pan: -0.1, metal: 0.45, noise: 0.5, lp: 11000}},
    {name: 'ride', inst: 'ride', lu: -20, notes: drums([3], '5.6.5.6.5.6.....'),
      p: {dec: 0.7, base: 340, pan: 0.3}},
    {name: 'rim', inst: 'rim', lu: -16, rev: 0.12, dly: 0.12, notes: drums([1, 2], '.......5......4.'), p: {pan: 0.35}},
    {name: 'bass', inst: 'mono', lu: -4, duck: 0.5, role: 'bass', notes: bass,
      p: {saw: 0.6, sq: 0.2, sub: 0.6, cut: 260, envOct: 2.4, envDec: 0.06, res: 0.5, att: 0.002, adec: 0.12, sus: 0.2, rel: 0.02, drive: 1.9, hp: 30}},
    {name: 'keys', inst: 'stab', lu: -4.5, rev: 0.25, dly: 0.15, duck: 0.4, hum: 0.002, role: 'chords', notes: keys,
      p: {det: 8, cut: 700, envOct: 2, envDec: 0.1, q: 1.6, dec: 0.2, sus: 0.1, att: 0.003, rel: 0.1, body: 0.15, spread: 0.5},
      fx: [['lpAuto', [[0, 1100], [2.13, 2200], [5.33, 2600], [6.4, 5500]], 1.4], ['hp', 180], ['peak', 360, 1, -2],
        ['chorus', {rate: 0.5, depth: 0.002, delay: 0.011, mix: 0.2}], ['drive', 1.3]]},
    {name: 'pad', inst: 'pad', lu: -13, rev: 0.5, duck: 0.55, duckRel: 0.22, role: 'chords', notes: pad,
      p: {voices: 5, det: 12, width: 0.9, cut: 1500, q: 0.6, att: 0.3, rel: 0.5},
      fx: [['hp', 200], ['chorus', {rate: 0.3, depth: 0.004, delay: 0.015, mix: 0.4}]]},
    {name: 'riser', inst: 'riser', lu: -15, rev: 0.3, notes: [[40, 8, null, 0.8]],
      p: {f0: 500, f1: 7000, q: 1.8, curve: 1.5, shape: 2}},
    {name: 'crash', inst: 'crash', lu: -15, rev: 0.3, notes: [[48, 1, null, 1], [52, 1, null, 0.8], [62, 1, null, 0.8]], p: {dec: 1.1}},
    {name: 'boom', inst: 'boom', pk: -6, notes: [[0, 1, 'D2', 0.6], [48, 1, 'D2', 1], [52, 1, 'D2', 0.9], [62, 1, 'D2', 0.8]], p: {dec: 0.5}}
  ],
  // List item voice: A4, D5 and F5 are tones of both Dm9 and Bbmaj7, so they fit whichever bar an item lands in.
  items: {
    inst: 'pluck', lu: -8, rev: 0.25, dly: 0.2, duck: 0.2,
    p: {det: 6, sq: 0.1, cut: [[0, 2600], [8.5, 3200]], envOct: 1.5, envDec: 0.08, q: 1, dec: 0.22, rel: 0.08, spread: 0.5},
    pitches: ['A4', 'D5', 'F5'], steps: 2, velocity: 0.85
  }
};
export default song;
