// Mix measurements from the synth-music-from-code skill, ported to JS: part loudness in the mix,
// band balance after mastering, and stereo correlation. The music stage reads this report the way the
// skill's render.js --report and analyze.py are read, since the model cannot listen.
import {biquadRun, lufs, renderSong} from '../src/videos/song/engine.js';
import {songFor, type TemplateSong} from '../src/videos/song/index.ts';
import type {BeatScore} from '../src/videos/beat/score.ts';

const EDGES = [20, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000];

/** Band energies in dB relative to the total, from Butterworth-ish band passes. */
export function bandBalance(left: Float32Array, right: Float32Array) {
  const mono = new Float32Array(left.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (left[i] + right[i]) / 2;
  const energy = (x: Float32Array) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return s; };
  const total = energy(mono) + 1e-20;
  const out: Record<string, number> = {};
  for (let k = 0; k < EDGES.length - 1; k++) {
    const x = mono.slice();
    for (const pass of [0, 1]) { biquadRun(x, 'hp', EDGES[k], 0.707, 0); biquadRun(x, 'lp', EDGES[k + 1], 0.707, 0); void pass; }
    out[`${EDGES[k]}-${EDGES[k + 1]}`] = Math.round(10 * Math.log10(energy(x) / total + 1e-12) * 10) / 10;
  }
  return out;
}

export function correlation(left: Float32Array, right: Float32Array) {
  let sl = 0, sr = 0, sll = 0, srr = 0, slr = 0;
  const n = left.length;
  for (let i = 0; i < n; i++) { sl += left[i]; sr += right[i]; sll += left[i] * left[i]; srr += right[i] * right[i]; slr += left[i] * right[i]; }
  const cov = slr / n - (sl / n) * (sr / n);
  return Math.round(cov / Math.sqrt((sll / n - (sl / n) ** 2) * (srr / n - (sr / n) ** 2) + 1e-20) * 1000) / 1000;
}

/** The full report for one list count, plus the mix problems that need no ears. */
export function songReport(score: BeatScore, song: TemplateSong, count: number) {
  const r = renderSong(songFor(score, song, count));
  const kick = r.report.find((p) => p.name === 'kick' || song.parts.find((x) => x.name === p.name)?.inst === 'kick');
  const parts = r.report.map((p) => ({name: p.name, lufsInMix: Math.round(p.inMix * 10) / 10, vsKick: kick ? Math.round((p.inMix - kick.inMix) * 10) / 10 : null}));
  const bands = bandBalance(r.L, r.R);
  const corr = correlation(r.L, r.R);
  const problems: string[] = [];
  if (bands['8000-16000'] > bands['4000-8000'] + 1.5) problems.push(`8-16 kHz (${bands['8000-16000']} dB) is well above 4-8 kHz (${bands['4000-8000']} dB): hats are too bright or too loud`);
  if (corr > 0.985) problems.push(`stereo correlation ${corr} is nearly mono: widen chords and pan percussion (target 0.87-0.96)`);
  if (corr < 0.75) problems.push(`stereo correlation ${corr} is too wide: keep kick and bass centred (target 0.87-0.96)`);
  const low = 10 * Math.log10(10 ** (bands['20-60'] / 10) + 10 ** (bands['60-120'] / 10));
  if (low < -6) problems.push(`the low end is thin (20-120 Hz is ${low.toFixed(1)} dB of the mix, target -1 to -4): raise kick or bass`);
  if (low > -0.5) problems.push(`the low end swamps the mix (20-120 Hz is ${low.toFixed(1)} dB): lower kick or bass, or brighten the chords`);
  return {lufs: Math.round(lufs(r.L, r.R) * 100) / 100, truePeak: Math.round(r.tp * 100) / 100, correlation: corr, bands, parts, problems};
}
