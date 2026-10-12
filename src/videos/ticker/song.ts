import {bar, bars, cat, chord, drums, hits} from '../song/helpers.ts';
import type {TemplateSong} from '../song/fit.ts';

// Two chords plus a pushed-in resolution: Am9 <-> D9, final stamp lands on Am9.
const AM9 = ['C4', 'E4', 'G4', 'B4'];
const D9 = ['C4', 'E4', 'F#4', 'A4'];

// Nu-disco octave-bounce bass; the next root is pushed in on step 14.
const bounce = (b: number, r: string, o: string, nxt: string) =>
  bar(b, [[2, 1, r, 1], [3, 0.75, o, 0.65], [6, 1, r, 0.9], [7, 0.75, o, 0.65], [10, 1, r, 0.95], [11, 0.75, o, 0.65], [14, 1.5, nxt, 0.85]]);

const song: TemplateSong = {
  id: 'ticker',
  title: 'Ticker',
  genre: 'nu-disco / deep house',
  key: 'A dorian',
  scale: [9, 11, 0, 2, 4, 6, 7],
  finalStep: 52,
  seed: 77,
  swing: 0.1,
  fade: 0.3,
  duckRel: 0.15,
  retDuck: 0.35,
  sections: [['Pickup', 0, 1], ['Groove', 1, 3], ['Drop', 3, 4]],
  delay: {steps: 3, fb: 0.38, lp: 3800, hp: 420, gain: 1, toRev: 0.22},
  reverb: {size: 0.85, decay: 1.6, damp: 5500, predelay: 0.015, hp: 240, lp: 9000, gain: 1},
  master: {
    eq: [['ls', 80, 0.7, 0.5], ['peak', 2800, 0.7, 1.5]],
    comp: {thr: -12, ratio: 2, att: 0.015, rel: 0.12, knee: 6},
    sat: 1.2,
  },
  parts: [
    {
      name: 'kick', inst: 'kick', pk: 0,
      notes: cat(
        [[0, 1, null, 0.7], [4, 1, null, 0.7]],
        drums([0], '........8...8...'),
        drums([1, 2], 'X...X...X...X...'),
        [[48, 1, null, 0.95], [52, 1, null, 1]],
      ),
      p: {f0: 200, f1: 55, pd: 0.03, hold: 0.012, dec: 0.12, click: 0.22, drive: 1.8, knock: 0.18, len: 0.4},
    },
    {
      name: 'clap', inst: 'clap', lu: -8, rev: 0.25, hum: 0.002, fx: [['drive', 1.7]],
      notes: cat(drums([1, 2], '....9.......9...'), drums([3], '....9')),
      p: {fc: 1550, q: 1, dec: 0.12, hp: 650},
    },
    {
      name: 'hatC', inst: 'hat', lu: -17, swing: true, hum: 0.002, vrand: 0.12,
      notes: cat(
        drums([0], '.363336333633363'),
        drums([1], '3363336333633363'),
        drums([2], '3363336333633'),
        drums([3], '.363'),
      ),
      p: {dec: 0.03, bp: 8800, hp: 6800, pan: 0.15, metal: 0.4, noise: 0.6},
    },
    {
      name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.1, swing: true,
      notes: drums([3], '..7', 1.5),
      p: {dec: 0.17, bp: 8000, hp: 5500, pan: -0.12, metal: 0.45, noise: 0.5, lp: 11000},
    },
    {
      name: 'ride', inst: 'ride', lu: -20,
      notes: drums([3], '.5.6'),
      p: {dec: 0.7, base: 340, pan: 0.3},
    },
    {
      name: 'rim', inst: 'rim', lu: -16, rev: 0.15, dly: 0.12, swing: true,
      notes: cat(drums([1], '.......5......4.'), drums([2], '.......5')),
      p: {pan: 0.35},
    },
    {
      // short roll that stops early, leaving air before the step-48 cue
      name: 'snare', inst: 'snare', lu: -11, rev: 0.2,
      notes: bar(2, [[10, 1, null, 0.3], [11, 1, null, 0.4]]),
      p: {f: 220, ndec: 0.1, bdec: 0.06, body: 0.5},
    },
    {
      name: 'bass', inst: 'mono', lu: -3, duck: 0.55, swing: true, role: 'bass',
      notes: cat(
        bounce(1, 'D2', 'D3', 'A1'),
        bar(2, [[2, 1, 'A1', 1], [3, 0.75, 'A2', 0.65], [6, 1, 'A1', 0.9], [7, 0.75, 'A2', 0.65], [10, 1, 'A1', 0.95], [11, 0.75, 'A2', 0.65]]),
        bar(3, [[0, 3, 'D2', 0.9]]),
        [[52, 10, 'A1', 1]],
      ),
      p: {saw: 0.25, sub: 1, cut: 330, envOct: 1.8, envDec: 0.06, res: 0.15, att: 0.003, adec: 0.2, sus: 0.6, rel: 0.03, drive: 1.9, glide: 0.02, hp: 28},
    },
    {
      name: 'keys', inst: 'stab', lu: -4.5, rev: 0.3, dly: 0.22, duck: 0.4, swing: true, hum: 0.002, role: 'chords',
      notes: cat(
        hits(0, [[0, 2, AM9, 0.7], [3, 2, AM9, 0.62], [6, 3, AM9, 0.75], [13, 3, D9, 0.85]]),
        hits(1, [[0, 1.5, D9, 0.6], [6, 2, D9, 0.75], [10, 1, D9, 0.66], [13, 3, AM9, 0.85]]),
        hits(2, [[0, 2, AM9, 0.85], [6, 2, AM9, 0.78], [10, 1, AM9, 0.66]]),
        chord(3, 4, 10, ['A3', 'C4', 'E4', 'G4', 'B4'], 1),
      ),
      p: {det: 7, cut: 900, envOct: 1.4, envDec: 0.14, q: 0.9, dec: 0.3, sus: 0.35, att: 0.004, rel: 0.16, body: 0.22, spread: 0.55},
      fx: [
        ['lpAuto', [[0, 1500], [1.9, 2800], [5.0, 3600], [5.95, 3600], [6.0, 7000]], 0.7],
        ['hp', 160], ['peak', 380, 1, -2],
        ['chorus', {rate: 0.5, depth: 0.0025, delay: 0.012, mix: 0.35}],
        ['drive', 1.25],
      ],
    },
    {
      // Un-ducked, bright D9 stab on the ctaBrand cue at step 48, right after a gap.
      name: 'cueStab', inst: 'stab', lu: -2, rev: 0.2, dly: 0.12, duck: 0, role: 'chords',
      notes: chord(3, 0, 1.5, ['F#4', 'A4', 'C5', 'E5'], 0.95),
      p: {det: 6, cut: 4500, envOct: 0.8, envDec: 0.1, q: 0.8, dec: 0.2, sus: 0.2, att: 0.002, rel: 0.1, body: 0.15, spread: 0.5},
      fx: [['hp', 300]],
    },
    {
      name: 'pad', inst: 'pad', lu: -13, rev: 0.5, duck: 0.55, duckRel: 0.25, role: 'chords',
      notes: cat(
        chord(3, 2, 2, ['A3', 'E4', 'F#4', 'C5'], 0.7, {att: 0.1}),
        chord(3, 4, 12, ['A3', 'E4', 'G4', 'C5'], 0.8, {att: 0.015}),
      ),
      p: {voices: 5, det: 12, width: 0.9, cut: 1600, q: 0.6, att: 0.3, rel: 0.6},
      fx: [['hp', 200], ['chorus', {rate: 0.3, depth: 0.004, delay: 0.015, mix: 0.4}]],
    },
    {
      name: 'riser', inst: 'riser', lu: -18, rev: 0.3,
      notes: [[40, 8, null, 0.5]],
      p: {f0: 600, f1: 6000, q: 2, curve: 1.5, shape: 2},
    },
    {
      name: 'crash', inst: 'crash', lu: -15, rev: 0.25,
      notes: [[0, 1, null, 0.7], [52, 1, null, 1]],
      p: {dec: 1.2},
    },
    {
      name: 'boom', inst: 'boom', pk: -6,
      notes: [[0, 1, 'A1', 0.7], [4, 1, 'A1', 0.55], [48, 1, 'A1', 0.7], [52, 1, 'A1', 1]],
      p: {dec: 0.6},
    },
  ],
  items: {
    inst: 'fmpluck', lu: -6, rev: 0.2, dly: 0.25, duck: 0.2,
    pitches: ['A4', 'C5', 'E5'],
    steps: 2,
    velocity: 0.85,
    p: {ratio: 2, idx: 1.8, idec: 0.08, dec: 0.2},
  },
};
export default song;
