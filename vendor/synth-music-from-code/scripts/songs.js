// ===== songs.js — four tracks: beats, bass and two or three chords. No lead melodies. =====
'use strict';
// Note rows: [step (16th from track start), length in steps, note name or null for drums, velocity, extra]
function drums(barList, str, dur, extra) {
  var out = [];
  barList.forEach(function (b) {
    for (var i = 0; i < 16; i++) {
      var c = str[i]; if (!c || c === '.') continue;
      var v = c === 'X' ? 1 : c === 'x' ? 0.8 : parseInt(c, 10) / 9;
      out.push([b * 16 + i, dur || 1, null, v, extra]);
    }
  });
  return out;
}
function bar(b, rows) { return rows.map(function (e) { var c = e.slice(); c[0] += b * 16; return c; }); }
function chord(b, step, dur, notes, vel, extra) { return notes.map(function (n) { return [b * 16 + step, dur, n, vel, extra]; }); }
function hits(b, list) { var o = []; list.forEach(function (h) { o = o.concat(chord(b, h[0], h[1], h[2], h[3], h[4])); }); return o; }
function cat() { return [].concat.apply([], arguments); }
var FINAL = 112;   // bar 8, beat 1

var SONGS = {};

// ------------------------------------------------------------------ DEEP HOUSE — Am9 / D9, one Gmaj9
(function () {
  var AM9 = ['C4', 'E4', 'G4', 'B4'], D9 = ['C4', 'E4', 'F#4', 'A4'], GM9 = ['B3', 'D4', 'F#4', 'A4'];
  // two-bar stab hook: three hits, then the next chord is pushed in early on the last "a" of beat 4
  function hA(b, c, nxt) { return hits(b, [[0, 2, c, 0.85], [3, 2, c, 0.62], [6, 3, c, 0.75], [13, 3, nxt, 0.9]]); }
  function hB(b, c, nxt) { return hits(b, [[2, 2, c, 0.72], [6, 2.5, c, 0.78], [10, 2, c, 0.66], [13, 3, nxt, 0.9]]); }
  var keys = cat(hA(0, AM9, D9), hB(1, D9, AM9), hA(2, AM9, D9), hB(3, D9, AM9), hA(4, AM9, D9), hB(5, D9, GM9),
    hits(6, [[2, 2, GM9, 0.75], [6, 2.5, GM9, 0.8], [10, 4, GM9, 0.72]]),
    chord(7, 0, 7, ['A3', 'C4', 'E4', 'G4', 'B4'], 0.9));
  var pad = cat(chord(4, 0, 13, ['A3', 'E4', 'G4', 'B4'], 0.8), chord(4, 13, 16, ['A3', 'E4', 'F#4', 'C5'], 0.8),
    chord(5, 13, 17, ['B3', 'D4', 'F#4', 'A4'], 0.8), chord(7, 0, 7, ['A3', 'E4', 'G4', 'C5'], 0.8, { att: 0.015 }));
  function bA(b, r, r2, nxt) { return bar(b, [[2, 1.5, r, 1], [6, 1, r, 0.72], [7, 1, r2, 0.8], [10, 2, r, 0.9], [13, 2.5, nxt, 0.9]]); }
  var bass = cat(bar(0, [[13, 2.5, 'D2', 0.85]]), bA(1, 'D2', 'D3', 'A1'), bA(2, 'A1', 'A2', 'D2'),
    bar(3, [[2, 1.5, 'D2', 1], [6, 1, 'D2', 0.72], [7, 1, 'D3', 0.8], [10, 1.5, 'D2', 0.9], [13, 2.5, 'A1', 0.95]]),
    bA(4, 'A1', 'A2', 'D2'), bA(5, 'D2', 'D3', 'G1'),
    bar(6, [[2, 1.5, 'G1', 1], [6, 1, 'G1', 0.72], [7, 1, 'G2', 0.8], [10, 3, 'G1', 0.9]]), [[FINAL, 6, 'A1', 1]]);
  var conga = cat(
    bar(3, [[8, 1, 'G4', 0.5, { pan: 0.4 }], [10, 1, 'G4', 0.5, { pan: 0.4 }], [11, 1, 'E4', 0.55, { pan: 0.25 }], [12, 1, 'E4', 0.65, { pan: 0.25 }], [13, 1, 'D4', 0.7, { pan: -0.2 }], [14, 1, 'A3', 0.8, { pan: -0.35 }], [15, 1, 'A3', 0.85, { pan: -0.35 }]]),
    [4, 5].reduce(function (a, b) { return a.concat(bar(b, [[3, 1, 'E4', 0.45, { pan: 0.3 }], [7, 1, 'A3', 0.4, { pan: -0.35 }], [11, 1, 'D4', 0.45, { pan: -0.15 }], [14, 1, 'A3', 0.45, { pan: -0.35 }]])); }, []));
  SONGS.deep = {
    id: 'deep', title: 'Deep house', bpm: 120, key: 'A dorian', scale: [9, 11, 0, 2, 4, 6, 7],
    length: 15.0, finalStep: FINAL, seed: 11, swing: 0.14, fade: 0.3, duckRel: 0.17,
    sections: [['Pickup', 0, 1], ['Groove', 1, 4], ['Drop', 4, 6], ['Variation', 6, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.4, lp: 3200, hp: 450, gain: 1, toRev: 0.3 },
    reverb: { size: 1.0, decay: 2.2, damp: 5000, predelay: 0.02, hp: 220, lp: 8500, gain: 1 },
    retDuck: 0.35,
    master: { eq: [['ls', 90, 0.7, 0.5], ['peak', 320, 0.8, -1], ['peak', 3000, 0.7, 1.5]], comp: { thr: -13, ratio: 1.8, att: 0.02, rel: 0.15, knee: 6 }, sat: 1.15 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, notes: cat(drums([1, 2, 4, 5, 6], 'X...X...X...X...'), drums([3], 'X...X...X.......'), [[FINAL, 1, null, 1]]),
        p: { f0: 160, f1: 55, pd: 0.04, hold: 0.015, dec: 0.14, click: 0.18, drive: 1.5, knock: 0.1, len: 0.45 } },
      { name: 'clap', inst: 'clap', lu: -9, rev: 0.3, hum: 0.002, fx: [['drive', 1.6]], notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9...........')), p: { fc: 1500, q: 1, dec: 0.13, hp: 600 } },
      { name: 'shaker', inst: 'shaker', lu: -18, rev: 0.1, swing: true, hum: 0.003, vrand: 0.12, notes: drums([0, 1, 2, 3, 4, 5, 6], '3273327332733273'), p: { fc: 5500, q: 1.1, hp: 3300, att: 0.007, dec: 0.045, pan: 0.25 } },
      { name: 'hatC', inst: 'hat', lu: -17, swing: true, vrand: 0.1, notes: drums([1, 2, 3], '..6...6...6...6.'), p: { dec: 0.035, bp: 8500, hp: 6500, pan: -0.15, metal: 0.45, noise: 0.6 } },
      { name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.1, swing: true, notes: cat(drums([4, 5], '..7...7...7...7.', 3), drums([6], '..7...7...7.....', 3)), p: { dec: 0.19, bp: 8000, hp: 5500, pan: -0.1, metal: 0.45, noise: 0.5, lp: 11000 } },
      { name: 'rim', inst: 'rim', lu: -16, rev: 0.18, dly: 0.12, swing: true, notes: cat(drums([1, 2, 4, 5], '.......5......4.'), drums([3, 6], '.......5........')), p: { pan: 0.35 } },
      { name: 'conga', inst: 'drum', lu: -13, rev: 0.2, swing: true, notes: conga, p: { dec: 0.16, bend: 0.3, bendT: 0.012, slap: 0.3, slapF: 2300, drive: 1.2 } },
      { name: 'snare', inst: 'snare', lu: -13, rev: 0.25, notes: bar(3, [[12, 1, null, 0.35], [13, 1, null, 0.45], [14, 1, null, 0.6], [15, 1, null, 0.8]]), p: { f: 220, ndec: 0.11, bdec: 0.06, body: 0.5 } },
      { name: 'bass', inst: 'mono', lu: -4, duck: 0.5, swing: true, notes: bass, role: 'bass',
        p: { saw: 0.18, sub: 1, cut: 380, envOct: 1.2, envDec: 0.08, res: 0.1, att: 0.004, adec: 0.3, sus: 0.7, rel: 0.04, drive: 1.8, glide: 0.03, hp: 28 } },
      { name: 'keys', inst: 'stab', lu: -4.5, rev: 0.3, dly: 0.2, duck: 0.4, swing: true, hum: 0.002, notes: keys, role: 'chords',
        p: { det: 7, cut: 900, envOct: 1.4, envDec: 0.14, q: 0.9, dec: 0.32, sus: 0.35, att: 0.004, rel: 0.16, body: 0.22, spread: 0.55 },
        fx: [['lpAuto', [[0, 1300], [1.9, 2800], [7.85, 2800], [8.0, 6000]], 0.7], ['hp', 160], ['peak', 380, 1, -2], ['chorus', { rate: 0.5, depth: 0.0025, delay: 0.012, mix: 0.35 }], ['drive', 1.25]] },
      { name: 'pad', inst: 'pad', lu: -13, rev: 0.5, duck: 0.55, duckRel: 0.25, notes: pad, role: 'chords',
        p: { voices: 5, det: 12, width: 0.9, cut: 1400, q: 0.6, att: 0.4, rel: 0.6 }, fx: [['hp', 200], ['chorus', { rate: 0.3, depth: 0.004, delay: 0.015, mix: 0.4 }]] },
      { name: 'riser', inst: 'riser', lu: -15, rev: 0.3, notes: [[8, 8, null, 0.5], [56, 8, null, 0.8]], p: { f0: 500, f1: 7000, q: 1.8, curve: 1.5, shape: 2 } },
      { name: 'crash', inst: 'crash', lu: -15, rev: 0.3, notes: [[64, 1, null, 0.7], [FINAL, 1, null, 0.8]], p: { dec: 1.3 } }
    ]
  };
})();

// ------------------------------------------------------------------ TECH HOUSE — Am7 / Dm7 organ stab
(function () {
  var AM7 = ['A3', 'C4', 'E4', 'G4'], DM7 = ['A3', 'C4', 'D4', 'F4'];
  function sA(b, c) { return hits(b, [[3, 1, c, 0.85], [6, 1, c, 0.68], [10, 1.5, c, 0.9]]); }
  function sB(b, c) { return hits(b, [[3, 1, c, 0.85], [6, 1, c, 0.68], [9, 1, c, 0.6], [12, 2, c, 0.9]]); }
  var organ = cat(sA(0, AM7), sB(0 + 1, AM7), sA(2, AM7), hits(3, [[3, 1, AM7, 0.85], [6, 1, AM7, 0.7]]),
    sA(4, AM7), sB(5, DM7), sA(6, AM7), hits(6, [[13, 1, DM7, 0.75]]), chord(7, 0, 3, ['A3', 'C4', 'E4', 'G4', 'A4'], 0.9));
  function bl(b, r, o, g) { return bar(b, [[2, 1, r, 1], [6, 1, r, 0.85], [7, 0.5, o, 0.6], [10, 1, r, 0.95], [14, 1, r, 0.85], [15, 0.5, g, 0.6]]); }
  var bass = cat(bl(1, 'A1', 'A2', 'G1'), bl(2, 'A1', 'A2', 'C2'),
    bar(3, [[2, 1, 'A1', 1], [6, 1, 'A1', 0.85], [7, 0.5, 'A2', 0.6], [10, 1, 'A1', 0.95], [14, 0.75, 'E2', 0.8], [15, 0.75, 'G2', 0.85]]),
    bl(4, 'A1', 'A2', 'C2'), bl(5, 'D2', 'D3', 'C2'), bar(6, [[2, 1, 'A1', 1], [6, 1, 'A1', 0.85], [7, 0.5, 'A2', 0.6], [10, 1, 'A1', 0.95], [13, 1, 'D2', 0.85]]), [[FINAL, 4, 'A1', 1]]);
  var BG = [[3, 1, 'E5', 0.45, { pan: 0.35 }], [7, 1, 'A4', 0.5, { pan: 0.1 }], [11, 1, 'E5', 0.5, { pan: 0.35 }], [14, 1, 'C5', 0.4, { pan: -0.25 }]];
  var bongo = cat(bar(2, BG), bar(3, [[3, 1, 'E5', 0.45, { pan: 0.35 }], [7, 1, 'A4', 0.5, { pan: 0.1 }],
    [8, 1, 'E5', 0.55, { pan: 0.35 }], [10, 1, 'C5', 0.6, { pan: -0.25 }], [11, 1, 'C5', 0.5, { pan: -0.25 }], [12, 1, 'A4', 0.65, { pan: 0.1 }], [13, 1, 'A4', 0.6, { pan: 0.1 }], [14, 1, 'E4', 0.75, { pan: -0.1 }], [15, 1, 'E4', 0.8, { pan: -0.1 }]]),
    bar(4, BG), bar(5, BG), bar(6, BG));
  SONGS.tech = {
    id: 'tech', title: 'Tech house', bpm: 900 / 7, key: 'A minor', scale: [9, 11, 0, 2, 4, 5, 7],
    length: 224 / 15, finalStep: FINAL, seed: 22, swing: 0.11, fade: 0.3, duckRel: 0.14,
    sections: [['Pickup', 0, 1], ['Groove', 1, 3], ['Variation', 3, 4], ['Drop', 4, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.38, lp: 4200, hp: 400, gain: 1, toRev: 0.2 },
    reverb: { size: 0.8, decay: 1.5, damp: 6000, predelay: 0.015, hp: 250, lp: 9500, gain: 1 },
    retDuck: 0.35,
    master: { eq: [['ls', 80, 0.7, 0.5], ['peak', 2800, 0.7, 1.5]], comp: { thr: -12, ratio: 2, att: 0.015, rel: 0.12, knee: 6 }, sat: 1.2 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, notes: cat(drums([0], 'X...X...X.......'), drums([1, 2, 4, 5, 6], 'X...X...X...X...'), drums([3], 'X...X...X.......'), [[FINAL, 1, null, 1]]),
        p: { f0: 230, f1: 55, pd: 0.026, hold: 0.012, dec: 0.11, click: 0.3, drive: 2.0, knock: 0.22, len: 0.4 } },
      { name: 'clap', inst: 'clap', lu: -8, rev: 0.22, hum: 0.002, fx: [['drive', 1.8]], notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9...........')), p: { fc: 1600, q: 1.1, dec: 0.11, hp: 700 } },
      { name: 'hatC', inst: 'hat', lu: -17, swing: true, hum: 0.002, vrand: 0.12, notes: cat(drums([0], '..5...5...5...5.'), drums([1, 2, 3], '3363336333633363'), drums([4, 5, 6], '33.333.333.333.3')),
        p: { dec: 0.03, bp: 9000, hp: 7000, pan: 0.15, metal: 0.4, noise: 0.6 } },
      { name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.1, swing: true, notes: drums([4, 5, 6], '..7...7...7...7.', 1.6), p: { dec: 0.17, bp: 8000, hp: 5500, pan: -0.12, metal: 0.45, noise: 0.5, lp: 11000 } },
      { name: 'ride', inst: 'ride', lu: -20, swing: true, notes: drums([4, 5, 6], '5.6.5.6.5.6.5.6.'), p: { dec: 0.7, base: 340, pan: 0.3 } },
      { name: 'bongo', inst: 'drum', lu: -13, rev: 0.15, swing: true, notes: bongo, p: { dec: 0.1, bend: 0.3, bendT: 0.01, slap: 0.4, slapF: 2600, drive: 1.2 } },
      { name: 'snare', inst: 'snare', lu: -11, rev: 0.2, notes: bar(3, [[12, 1, null, 0.4], [13, 1, null, 0.5], [14, 0.5, null, 0.6], [14.5, 0.5, null, 0.66], [15, 0.5, null, 0.75], [15.5, 0.5, null, 0.85]]), p: { f: 220, ndec: 0.1 } },
      { name: 'bass', inst: 'mono', lu: -3, duck: 0.55, swing: true, notes: bass, role: 'bass',
        p: { saw: 0.3, sub: 1, cut: 300, envOct: 2.2, envDec: 0.05, res: 0.2, att: 0.002, adec: 0.12, sus: 0.55, rel: 0.02, drive: 2, glide: 0.02, hp: 30 } },
      { name: 'organ', inst: 'organ', lu: -4.5, dly: 0.24, rev: 0.18, duck: 0.35, swing: true, notes: organ, role: 'chords',
        p: { dec: 0.3, sus: 0.22, rel: 0.06, click: 0.2, spread: 0.6 },
        fx: [['lpAuto', [[0, 1200], [1.8, 3600], [7.4, 4200], [7.47, 9000]], 0.7], ['hp', 200], ['chorus', { rate: 0.7, depth: 0.002, delay: 0.01, mix: 0.3 }], ['drive', 1.3]] },
      { name: 'riser', inst: 'riser', lu: -14, rev: 0.3, notes: [[56, 8, null, 0.8]], p: { f0: 600, f1: 8000, q: 2 } },
      { name: 'crash', inst: 'crash', lu: -15, rev: 0.25, notes: [[64, 1, null, 0.7], [FINAL, 1, null, 0.8]], p: { dec: 1.2 } },
      { name: 'boom', inst: 'boom', pk: -6, notes: [[64, 1, 'A1', 0.8], [FINAL, 1, 'A1', 0.7]], p: { dec: 0.6 } }
    ]
  };
})();

// ------------------------------------------------------------------ MELODIC TECHNO — Am(add9) / Fmaj7 / G6
(function () {
  var PAD = { a: ['A3', 'C4', 'E4', 'B4'], f: ['F3', 'A3', 'C4', 'E4'], g: ['G3', 'B3', 'D4', 'E4'] };
  var PL = { a: ['E4', 'A4', 'C5'], f: ['F4', 'A4', 'C5'], g: ['D4', 'G4', 'B4'] };
  var GRID = [[0, 0.95], [3, 0.7], [6, 0.8], [8, 0.65], [11, 0.75], [14, 0.7]];   // 3-3-2-3-3-2 chord pulse
  function pulse(b, c, from, to) { var o = []; GRID.forEach(function (g) { if (g[0] >= (from || 0) && g[0] < (to || 16)) o = o.concat(chord(b, g[0], 1.5, PL[c], g[1])); }); return o; }
  var plan = ['a', 'a', 'f', 'g', 'a', 'f'];
  var pluck = cat.apply(null, plan.map(function (c, b) { return pulse(b, c); }).concat([pulse(6, 'f', 0, 8), pulse(6, 'g', 8, 16), chord(7, 0, 4, ['E4', 'A4', 'C5'], 0.9)]));
  var pad = cat.apply(null, plan.map(function (c, b) { return chord(b, 0, 16, PAD[c], b === 0 ? 0.7 : 0.85); }).concat([chord(6, 0, 8, PAD.f, 0.9), chord(6, 8, 8, PAD.g, 0.9), chord(7, 0, 6, ['A3', 'C4', 'E4', 'A4'], 0.85, { att: 0.015 })]));
  function roll(b, root, from, to) { var o = []; for (var s = from || 0; s < (to || 16); s++) if (s % 4) o.push([b * 16 + s, 0.75, root, s % 4 === 2 ? 0.9 : s % 4 === 1 ? 0.65 : 0.75]); return o; }
  var bass = cat(roll(1, 'A1'), roll(2, 'F1'), roll(3, 'G1', 0, 8), roll(4, 'A1'), roll(5, 'F1'), roll(6, 'F1', 0, 8), roll(6, 'G1', 8, 16), [[FINAL, 6, 'A1', 1]]);
  var roll3 = bar(3, [[0, 1, null, 0.22], [2, 1, null, 0.26], [4, 1, null, 0.3], [6, 1, null, 0.34], [8, 1, null, 0.4], [9, 1, null, 0.44], [10, 1, null, 0.48], [11, 1, null, 0.52],
    [12, 0.5, null, 0.56], [12.5, 0.5, null, 0.6], [13, 0.5, null, 0.64], [13.5, 0.5, null, 0.68], [14, 0.5, null, 0.72], [14.5, 0.5, null, 0.76], [15, 0.5, null, 0.82], [15.5, 0.5, null, 0.9]]);
  SONGS.melodic = {
    id: 'melodic', title: 'Melodic techno', bpm: 900 / 7, key: 'A minor', scale: [9, 11, 0, 2, 4, 5, 7],
    length: 224 / 15, finalStep: FINAL, seed: 33, swing: 0, fade: 0.3, duckRel: 0.2,
    sections: [['Pickup', 0, 1], ['Groove', 1, 3], ['Build', 3, 4], ['Drop', 4, 6], ['Variation', 6, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.45, lp: 3500, hp: 450, gain: 1, toRev: 0.35 },
    reverb: { size: 1.3, decay: 3.0, damp: 4800, predelay: 0.03, hp: 230, lp: 8000, gain: 1 },
    retDuck: 0.45,
    master: { eq: [['ls', 70, 0.7, 0.5], ['peak', 2800, 0.7, 1.0]], comp: { thr: -12, ratio: 2, att: 0.02, rel: 0.15, knee: 6 }, sat: 1.15 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, notes: cat(drums([1, 2, 4, 5, 6], 'X...X...X...X...'), drums([3], 'X...X...........'), [[FINAL, 1, null, 1]]),
        p: { f0: 185, f1: 55, pd: 0.042, hold: 0.015, dec: 0.15, click: 0.2, drive: 1.7, knock: 0.12, len: 0.5 } },
      { name: 'clap', inst: 'clap', lu: -9.5, rev: 0.45, fx: [['drive', 1.6]], notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9...........')), p: { fc: 1300, q: 0.9, dec: 0.16, hp: 550 } },
      { name: 'hatOff', inst: 'hat', lu: -16, rev: 0.1, vrand: 0.08, notes: drums([1, 2, 3, 4, 5, 6], '..7...7...7...7.'), p: { dec: 0.07, bp: 8000, hp: 6000, pan: 0.1, metal: 0.4, noise: 0.5, lp: 11500 } },
      { name: 'hat16', inst: 'hat', lu: -21, vrand: 0.15, notes: drums([4, 5, 6], '.3.3.3.3.3.3.3.3'), p: { dec: 0.025, bp: 10000, hp: 7500, pan: -0.2, metal: 0.3, noise: 0.6 } },
      { name: 'snare', inst: 'snare', lu: -12, rev: 0.35, notes: roll3, p: { f: 220, ndec: 0.12 } },
      { name: 'bass', inst: 'mono', lu: -4.5, duck: 0.6, duckRel: 0.12, notes: bass, role: 'bass',
        p: { saw: 0.8, sub: 0.7, cut: 150, envOct: 2.6, envDec: 0.05, res: 0.3, att: 0.002, adec: 0.1, sus: 0.4, rel: 0.02, drive: 1.7, hp: 30 } },
      { name: 'pad', inst: 'pad', lu: -9.5, rev: 0.5, duck: 0.75, duckRel: 0.22, notes: pad, role: 'chords',
        p: { voices: 7, det: 18, width: 1, cut: [[0, 600], [1.87, 950], [5.6, 1000], [7.4, 2300], [13.07, 1900]], q: 0.7, att: 0.25, rel: 0.5 },
        fx: [['hp', 150], ['chorus', { rate: 0.25, depth: 0.004, delay: 0.016, mix: 0.4 }]] },
      { name: 'pluck', inst: 'pluck', lu: -5, dly: 0.32, rev: 0.32, duck: 0.3, notes: pluck, role: 'chords',
        p: { det: 8, sq: 0.15, cut: [[0, 500], [1.87, 850], [5.6, 1300], [7.4, 3600], [9.33, 3000], [13.07, 3200]], envOct: 2, envDec: 0.07, q: 1, dec: 0.2, rel: 0.06, spread: 0.6 },
        fx: [['hp', 220], ['chorus', { rate: 0.4, depth: 0.002, delay: 0.012, mix: 0.3 }]] },
      { name: 'riser', inst: 'riser', lu: -11, rev: 0.4, notes: [[48, 16, null, 1]], p: { f0: 300, f1: 9000, q: 2.4, curve: 1.4, shape: 2.2 } },
      { name: 'crash', inst: 'crash', lu: -14, rev: 0.3, notes: [[64, 1, null, 0.8], [FINAL, 1, null, 0.8]], p: { dec: 1.4 } },
      { name: 'boom', inst: 'boom', pk: -5, notes: [[64, 1, 'A1', 0.9], [FINAL, 1, 'A1', 0.8]], p: { dec: 0.9 } }
    ]
  };
})();

// ------------------------------------------------------------------ TECHNO — Am7 / B♭maj7 dub chords
(function () {
  var AM7 = ['A3', 'C4', 'E4', 'G4'], BBM7 = ['Bb3', 'D4', 'F4', 'A4'];
  function dub(b, c, busy) { return hits(b, busy ? [[3, 1, c, 0.9], [10, 1, c, 0.75], [14, 0.75, c, 0.6]] : [[3, 1, c, 0.9], [10, 1, c, 0.75]]); }
  var stab = cat(dub(0, AM7), dub(1, AM7), dub(2, AM7), dub(3, BBM7), dub(4, AM7, 1), dub(5, AM7, 1), hits(6, [[3, 1, BBM7, 0.9], [10, 1, BBM7, 0.8]]), chord(7, 0, 3, ['A3', 'C4', 'E4', 'G4'], 0.95));
  function off(b, r) { return bar(b, [[2, 1.2, r, 1], [6, 1.2, r, 0.85], [10, 1.2, r, 0.95], [14, 1.2, r, 0.85]]); }
  var bass = cat(off(1, 'A1'), off(2, 'A1'), bar(3, [[2, 1.2, 'Bb1', 1], [6, 1.2, 'Bb1', 0.85]]), off(4, 'A1'), off(5, 'A1'), off(6, 'Bb1'), [[FINAL, 3, 'A1', 1]]);
  var toms = bar(3, [[8, 1, 'E3', 0.7, { pan: 0.4 }], [10, 1, 'D3', 0.7, { pan: 0.2 }], [11, 1, 'D3', 0.6, { pan: 0.2 }], [12, 1, 'C3', 0.75, { pan: 0 }], [13, 1, 'Bb2', 0.8, { pan: -0.2 }], [14, 1, 'A2', 0.85, { pan: -0.4 }], [15, 1, 'A2', 0.9, { pan: -0.4 }]]);
  SONGS.techno = {
    id: 'techno', title: 'Techno', bpm: 900 / 7, key: 'A phrygian', scale: [9, 10, 0, 2, 4, 5, 7],
    length: 224 / 15, finalStep: FINAL, seed: 44, swing: 0.04, fade: 0.3, duckRel: 0.2,
    sections: [['Pickup', 0, 1], ['Groove', 1, 3], ['Variation', 3, 4], ['Drop', 4, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.55, lp: 2200, hp: 450, gain: 1, toRev: 0.35 },
    reverb: { size: 1.2, decay: 2.4, damp: 4200, predelay: 0.015, hp: 250, lp: 7500, gain: 1 },
    retDuck: 0.5,
    master: { eq: [['ls', 60, 0.7, 0.5], ['peak', 2600, 0.7, 1.0], ['hs', 9000, 0.7, -0.5]], comp: { thr: -12, ratio: 2, att: 0.015, rel: 0.12, knee: 6 }, sat: 1.2 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, keep: true, notes: cat(drums([0, 1, 2, 4, 5, 6], 'X...X...X...X...'), drums([3], 'X...X...X.......'), [[FINAL, 1, null, 1]]),
        p: { f0: 300, f1: 55, pd: 0.026, hold: 0.02, dec: 0.12, click: 0.35, drive: 2.8, knock: 0.25, len: 0.45 } },
      { name: 'rumble', inst: 'rumble', src: 'kick', pk: -12, duck: 0.95, duckRel: 0.3, notes: [], p: { size: 1.3, decay: 2.2, damp: 260 },
        fx: [['lp', 130, 0.7], ['drive', 2.0], ['lp', 160, 0.7], ['hp', 38, 0.7]] },
      { name: 'hatC', inst: 'hat', lu: -18, swing: true, vrand: 0.15, notes: cat(drums([1, 2, 4, 5, 6], '33.333.333.333.3'), drums([3], '33.333.333.3....')), p: { dec: 0.028, bp: 9000, hp: 7000, pan: 0.2, metal: 0.4, noise: 0.6 } },
      { name: 'hatO', inst: 'hat', lu: -14.5, rev: 0.08, swing: true, notes: drums([0, 1, 2, 3, 4, 5, 6], '..8...8...8...8.', 1.8), p: { dec: 0.15, bp: 7500, hp: 5000, pan: -0.1, metal: 0.45, noise: 0.45, lp: 10500 } },
      { name: 'clap', inst: 'clap', lu: -9, rev: 0.32, fx: [['drive', 1.8]], notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9...........')), p: { fc: 1500, q: 1, dec: 0.12, hp: 650 } },
      { name: 'ride', inst: 'ride', lu: -20, notes: drums([4, 5, 6], '5.3.5.3.5.3.5.3.'), p: { dec: 0.8, base: 360, pan: 0.35 } },
      { name: 'perc', inst: 'rim', lu: -16, dly: 0.2, swing: true, notes: drums([1, 2, 4, 5, 6], '......4....4.4..'), p: { pan: -0.35 } },
      { name: 'toms', inst: 'drum', lu: -10, rev: 0.25, notes: toms, p: { dec: 0.22, bend: 0.4, bendT: 0.025, slap: 0.2, slapF: 1500, drive: 1.5 } },
      { name: 'snare', inst: 'snare', lu: -11, rev: 0.2, notes: bar(3, [[12, 1, null, 0.4], [13, 1, null, 0.5], [14, 0.5, null, 0.6], [14.5, 0.5, null, 0.68], [15, 0.5, null, 0.76], [15.5, 0.5, null, 0.86]]), p: { f: 220, ndec: 0.1 } },
      { name: 'bass', inst: 'mono', lu: -5, duck: 0.5, swing: true, notes: bass, role: 'bass',
        p: { saw: 0.25, sub: 1, cut: 260, envOct: 1.5, envDec: 0.05, res: 0.15, att: 0.003, adec: 0.12, sus: 0.6, rel: 0.03, drive: 2.2, hp: 30 } },
      { name: 'dub', inst: 'stab', lu: -5, dly: 0.55, rev: 0.35, duck: 0.3, notes: stab, role: 'chords',
        p: { det: 12, cut: 380, envOct: 2.4, envDec: 0.06, q: 2.2, dec: 0.22, sus: 0, rel: 0.08, body: 0.08, spread: 0.5 },
        fx: [['lpAuto', [[0, 1400], [5.6, 2200], [7.45, 2400], [7.47, 4500]], 0.7], ['hp', 200], ['chorus', { rate: 0.35, depth: 0.003, delay: 0.013, mix: 0.4 }], ['width', 1.3]] },
      { name: 'riser', inst: 'riser', lu: -15, rev: 0.3, notes: [[56, 8, null, 0.7]], p: { f0: 500, f1: 8000, q: 2 } },
      { name: 'crash', inst: 'crash', lu: -15, rev: 0.2, notes: [[64, 1, null, 0.75], [FINAL, 1, null, 0.8]], p: { dec: 1.3 } },
      { name: 'boom', inst: 'boom', pk: -6, notes: [[64, 1, 'A1', 0.9], [FINAL, 1, 'A1', 0.8]], p: { dec: 0.7 } }
    ]
  };
})();
// ------------------------------------------------------------------ LO-FI 1 — "Night bus": Gm9 / C9 / Fmaj9 (ii–V–I in F)
(function () {
  var GM9 = ['Bb3', 'D4', 'F4', 'A4'], C9 = ['Bb3', 'D4', 'E4', 'G4'], FM9 = ['A3', 'C4', 'E4', 'G4'];
  // rolled chord: notes enter low to high a few ms apart, like a hand on a keyboard
  function rc(b, step, dur, ch, vel) { return ch.map(function (n, i) { return [b * 16 + step + i * 0.09, dur - i * 0.09, n, vel * (1 - 0.05 * i)]; }); }
  function full(b, ch) { return cat(rc(b, 0, 9.5, ch, 0.85), rc(b, 10, 5.5, ch, 0.55)); }
  function half(b, c1, c2) { return cat(rc(b, 0, 7.5, c1, 0.82), rc(b, 8, 7.5, c2, 0.75)); }
  var keys = cat(full(0, GM9), full(1, C9), full(2, FM9), half(3, GM9, C9), full(4, GM9), full(5, C9), half(6, FM9, C9), chord(7, 0, 9, ['F3', 'A3', 'C4', 'E4', 'G4'], 0.9));
  // jazzy embellishment: short single-note fills built from the current chord's tones
  var fill = cat(bar(3, [[12, 1, 'G4', 0.6], [13, 1, 'Bb4', 0.55], [14, 1, 'D5', 0.6], [15, 1, 'E5', 0.65]]),
    bar(5, [[12, 1, 'E5', 0.6], [13, 1, 'D5', 0.55], [14, 1, 'Bb4', 0.55], [15, 1, 'G4', 0.5]]),
    bar(6, [[12, 1, 'C5', 0.55], [13, 1, 'D5', 0.6], [14, 1, 'E5', 0.6], [15, 1, 'G5', 0.62]]), [[FINAL, 6, 'F5', 0.6]]);
  var bass = cat(bar(1, [[0, 7, 'C2', 1], [10, 4, 'C2', 0.8], [14, 2, 'G1', 0.7]]), bar(2, [[0, 7, 'F1', 1], [10, 4, 'F1', 0.8], [14, 2, 'A1', 0.7]]),
    bar(3, [[0, 6, 'G1', 1], [8, 6, 'C2', 0.9], [14, 2, 'A1', 0.7]]), bar(4, [[0, 7, 'G1', 1], [10, 4, 'G1', 0.8], [14, 2, 'Bb1', 0.7]]),
    bar(5, [[0, 7, 'C2', 1], [10, 4, 'C2', 0.8], [14, 2, 'E2', 0.7]]), bar(6, [[0, 6, 'F2', 1], [8, 6, 'C2', 0.9], [14, 2, 'E2', 0.7]]), [[FINAL, 8, 'F1', 1]]);
  SONGS.lofi1 = {
    id: 'lofi1', title: 'Lo-fi: Night bus', bpm: 76, key: 'F major', scale: [5, 7, 9, 10, 0, 2, 4],
    length: 24.1, finalStep: FINAL, seed: 55, swing: 0.22, fade: 0.4, duckRel: 0.2,
    sections: [['Pickup', 0, 1], ['Groove', 1, 4], ['Variation', 4, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.32, lp: 2400, hp: 400, gain: 1, toRev: 0.3 },
    reverb: { size: 0.9, decay: 1.8, damp: 3500, predelay: 0.02, hp: 220, lp: 6000, gain: 1 },
    retDuck: 0.2,
    master: { lofi: { wow: [0.5, 0.0011], flutter: [6.4, 0.00004], lp: 8500 }, eq: [['ls', 100, 0.7, 1], ['peak', 2500, 0.8, -1]], comp: { thr: -13, ratio: 2.5, att: 0.012, rel: 0.12, knee: 6 }, sat: 1.45 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, hum: 0.004, notes: cat(drums([1, 2, 4, 5, 6], 'X......7..8.....'), drums([3], 'X......7........'), [[FINAL, 1, null, 1]]),
        p: { f0: 120, f1: 55, pd: 0.03, hold: 0.02, dec: 0.16, click: 0.08, drive: 1.3, knock: 0.25, len: 0.45 }, fx: [['lp', 3500, 0.7]] },
      { name: 'snare', inst: 'snare', lu: -6, rev: 0.2, late: 0.02, hum: 0.004, notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9.......9.45')),
        p: { f: 220, body: 0.75, bdec: 0.08, ndec: 0.16, nhp: 1200, nlp: 5000 }, fx: [['lp', 6500, 0.7], ['drive', 1.4]] },
      { name: 'hat', inst: 'hat', lu: -16, swing: true, hum: 0.005, vrand: 0.15, notes: cat(drums([1, 2, 4, 5, 6], '5.3.5.3.5.3.5.3.'), drums([3], '5.3.5.3.5.3.....')),
        p: { dec: 0.03, bp: 7000, hp: 4800, lp: 8500, metal: 0.3, noise: 0.6, pan: 0.2 } },
      { name: 'shaker', inst: 'shaker', lu: -20, swing: true, hum: 0.004, vrand: 0.2, notes: drums([4, 5, 6], '2132213221322132'), p: { fc: 5000, q: 1, hp: 3000, att: 0.01, dec: 0.05, pan: -0.3 } },
      { name: 'bass', inst: 'mono', lu: -4.5, duck: 0.2, notes: bass, role: 'bass',
        p: { saw: 0.1, sub: 1, cut: 300, envOct: 1, envDec: 0.08, res: 0.1, att: 0.006, adec: 0.4, sus: 0.35, rel: 0.06, drive: 1.6, glide: 0.06, hp: 28 } },
      { name: 'keys', inst: 'ep', lu: -3.5, rev: 0.28, dly: 0.08, duck: 0.15, swing: true, notes: keys, role: 'chords',
        p: { idx: 1.2, idec: 0.45, dec: 2.6, tine: 0.22, rel: 0.35, trem: 0.15, tremRate: 2.5 },
        fx: [['lpAuto', [[0, 2200], [3.0, 4800]], 0.7], ['hp', 120], ['peak', 1500, 0.8, 2.5], ['chorus', { rate: 0.45, depth: 0.0025, delay: 0.012, mix: 0.3 }], ['drive', 1.5]] },
      { name: 'fill', inst: 'ep', lu: -9, rev: 0.32, dly: 0.18, duck: 0.1, swing: true, notes: fill, role: 'lead',
        p: { idx: 1.0, idec: 0.3, dec: 1.6, tine: 0.3, rel: 0.2, trem: 0.1, tremRate: 2.5 }, fx: [['lp', 5000, 0.7], ['hp', 250], ['drive', 1.3]] },
      { name: 'vinyl', inst: 'vinyl', lu: -24, notes: [[0, FINAL, null, 1]], p: { rate: 7, pops: 0.35, hiss: 0.06 } }
    ]
  };
})();

// ------------------------------------------------------------------ LO-FI 2 — "Corner store": Dm9 / G13 / Cmaj9 (D dorian)
(function () {
  var DM9 = ['F3', 'A3', 'C4', 'E4'], G13 = ['F3', 'A3', 'B3', 'E4'], CM9 = ['G3', 'B3', 'D4', 'E4'];
  function rc(b, step, dur, ch, vel) { return ch.map(function (n, i) { return [b * 16 + step + i * 0.08, dur - i * 0.08, n, vel * (1 - 0.05 * i)]; }); }
  function comp(b, ch) { return cat(rc(b, 0, 5.5, ch, 0.85), rc(b, 6, 9.5, ch, 0.6)); }
  var plan = [DM9, G13, DM9, G13, DM9, G13, CM9];
  var keys = cat.apply(null, plan.map(function (c, b) { return comp(b, c); }).concat([chord(7, 0, 9, ['D3', 'F3', 'A3', 'C4', 'E4'], 0.9)]));
  var fill = cat(bar(1, [[12, 1, 'B4', 0.55], [13, 1, 'A4', 0.5], [14, 1, 'F4', 0.55], [15, 1, 'E4', 0.5]]),
    bar(5, [[12, 1, 'A4', 0.55], [13, 1, 'B4', 0.55], [14, 1, 'D5', 0.6], [15, 1, 'E5', 0.6]]),
    bar(6, [[12, 1, 'E5', 0.6], [13, 1, 'D5', 0.55], [14, 1, 'B4', 0.55], [15, 1, 'G4', 0.5]]), [[FINAL, 6, 'A4', 0.6]]);
  function bD(b) { return bar(b, [[0, 6, 'D2', 1], [7, 1.5, 'D2', 0.7], [9, 5, 'A1', 0.85]]); }
  function bG(b) { return bar(b, [[0, 6, 'G1', 1], [7, 1.5, 'G1', 0.7], [9, 3, 'B1', 0.8], [12, 3, 'C2', 0.8]]); }
  var bass = cat(bG(1), bD(2), bG(3), bD(4), bG(5), bar(6, [[0, 6, 'C2', 1], [7, 1.5, 'C2', 0.7], [9, 3, 'G1', 0.8], [12, 3, 'B1', 0.8]]), [[FINAL, 7, 'D2', 1]]);
  SONGS.lofi2 = {
    id: 'lofi2', title: 'Lo-fi: Corner store', bpm: 88, key: 'D dorian', scale: [2, 4, 5, 7, 9, 11, 0],
    length: 21.1, finalStep: FINAL, seed: 66, swing: 0.2, fade: 0.4, duckRel: 0.18,
    sections: [['Pickup', 0, 1], ['Groove', 1, 4], ['Variation', 4, 7], ['Ending', 7, 8]],
    delay: { steps: 3, fb: 0.3, lp: 2500, hp: 400, gain: 1, toRev: 0.3 },
    reverb: { size: 0.85, decay: 1.6, damp: 3500, predelay: 0.02, hp: 220, lp: 6000, gain: 1 },
    retDuck: 0.2,
    master: { lofi: { wow: [0.55, 0.001], flutter: [6.8, 0.00004], lp: 8800 }, eq: [['ls', 100, 0.7, 1], ['peak', 2500, 0.8, -1]], comp: { thr: -13, ratio: 2.5, att: 0.012, rel: 0.12, knee: 6 }, sat: 1.45 },
    parts: [
      { name: 'kick', inst: 'kick', pk: 0, hum: 0.004, notes: cat(drums([1, 2, 4, 5, 6], 'X......8.8......'), drums([3], 'X......8........'), [[FINAL, 1, null, 1]]),
        p: { f0: 125, f1: 55, pd: 0.028, hold: 0.02, dec: 0.15, click: 0.1, drive: 1.4, knock: 0.25, len: 0.42 }, fx: [['lp', 3800, 0.7]] },
      { name: 'snare', inst: 'snare', lu: -6, rev: 0.18, late: 0.015, hum: 0.004, notes: cat(drums([1, 2, 4, 5, 6], '....9.......9...'), drums([3], '....9.......9.67')),
        p: { f: 220, body: 0.7, bdec: 0.07, ndec: 0.15, nhp: 1300, nlp: 5500 }, fx: [['lp', 7000, 0.7], ['drive', 1.4]] },
      { name: 'ghost', inst: 'snare', lu: -17, late: 0.01, hum: 0.006, notes: drums([2, 4, 5, 6], '..........3....3'), p: { f: 220, body: 0.4, bdec: 0.05, ndec: 0.08, nhp: 1500, nlp: 5000 }, fx: [['lp', 6000, 0.7]] },
      { name: 'hat', inst: 'hat', lu: -16, swing: true, hum: 0.004, vrand: 0.15, notes: cat(drums([0, 1, 2, 4, 5, 6], '4252425242524252'), drums([3], '425242524252....')),
        p: { dec: 0.028, bp: 7200, hp: 5000, lp: 8800, metal: 0.3, noise: 0.6, pan: 0.2 }, fx: [['gainAuto', [[0, 0.5], [2.6, 0.5], [2.75, 1]]]] },
      { name: 'hatO', inst: 'hat', lu: -18, swing: true, notes: drums([2, 4, 6], '..............6.', 1.8), p: { dec: 0.14, bp: 6500, hp: 4500, lp: 8500, metal: 0.35, noise: 0.5, pan: -0.2 } },
      { name: 'bass', inst: 'mono', lu: -4.5, duck: 0.2, swing: true, notes: bass, role: 'bass',
        p: { saw: 0.12, sub: 1, cut: 320, envOct: 1.2, envDec: 0.07, res: 0.1, att: 0.005, adec: 0.35, sus: 0.35, rel: 0.05, drive: 1.7, glide: 0.05, hp: 28 } },
      { name: 'keys', inst: 'ep', lu: -3.5, rev: 0.25, dly: 0.08, duck: 0.15, swing: true, notes: keys, role: 'chords',
        p: { idx: 1.3, idec: 0.4, dec: 2.4, tine: 0.24, rel: 0.3, trem: 0.15, tremRate: 2.9 },
        fx: [['lpAuto', [[0, 2400], [2.7, 5000]], 0.7], ['hp', 120], ['peak', 1500, 0.8, 2.5], ['chorus', { rate: 0.5, depth: 0.0025, delay: 0.012, mix: 0.3 }], ['drive', 1.5]] },
      { name: 'fill', inst: 'ep', lu: -9, rev: 0.3, dly: 0.18, duck: 0.1, swing: true, notes: fill, role: 'lead',
        p: { idx: 1.0, idec: 0.3, dec: 1.6, tine: 0.3, rel: 0.2, trem: 0.1, tremRate: 2.9 }, fx: [['lp', 5200, 0.7], ['hp', 250], ['drive', 1.3]] },
      { name: 'vinyl', inst: 'vinyl', lu: -24, notes: [[0, FINAL, null, 1]], p: { rate: 8, pops: 0.4, hiss: 0.06 } }
    ]
  };
})();
var LOFI_ORDER = ['lofi1', 'lofi2'];
var SONG_ORDER = ['deep', 'tech', 'melodic', 'techno'];

// ---- optional per-track brief: check.js compares the song against it ----
SONGS.deep.spec    = { bpm: 120,     key: 'A dorian',   final: 14.0,   maxLen: 15, sections: 'Pickup:0-1,Groove:1-4,Drop:4-6,Variation:6-7,Ending:7-8', bar4: 'fill' };
SONGS.tech.spec    = { bpm: 128.571, key: 'A minor',    final: 13.067, maxLen: 15, sections: 'Pickup:0-1,Groove:1-3,Variation:3-4,Drop:4-7,Ending:7-8', bar4: 'fill' };
SONGS.melodic.spec = { bpm: 128.571, key: 'A minor',    final: 13.067, maxLen: 15, sections: 'Pickup:0-1,Groove:1-3,Build:3-4,Drop:4-6,Variation:6-7,Ending:7-8', bar4: 'riser' };
SONGS.techno.spec  = { bpm: 128.571, key: 'A phrygian', final: 13.067, maxLen: 15, sections: 'Pickup:0-1,Groove:1-3,Variation:3-4,Drop:4-7,Ending:7-8', bar4: 'fill' };
SONGS.lofi1.spec   = { bpm: 76, key: 'F major',  final: 22.105, maxLen: 25 };
SONGS.lofi2.spec   = { bpm: 88, key: 'D dorian', final: 19.091, maxLen: 22 };
