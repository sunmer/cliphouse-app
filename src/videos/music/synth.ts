// Deterministic synthesizer and mastering chain. Same score and cues give the same samples.
// No randomness except a seeded generator, no clocks, no platform audio APIs.
import {SAMPLE_RATE, beatSeconds, durationInSamples, type Score} from './score.ts';
import type {Cue, Instrument} from './cues.ts';

export const TARGET_LUFS = -14;
export const CEILING_DBTP = -1;
/** Sample-peak ceiling of the limiter. Kept below -1 dBTP so inter-sample peaks stay under it. */
const LIMIT = 10 ** (-1.6 / 20);
/** Seconds an accent voice can ring after its note ends. Text edits may change audio in this tail. */
export const VOICE_TAIL = {pluck: 0.4, bell: 0.7, lead: 0.12} as const;

export type Stereo = {left: Float32Array; right: Float32Array};
const TAU = Math.PI * 2;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

function rng(seed: number) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000 * 2 - 1;
  };
}

type Voice = (t: number, i: number) => number;
// Each instrument returns a mono voice, its length in seconds, gain, and pan (-1 left to 1 right).
function voice(cue: Cue, noteSeconds: number, seed: number): {fn: Voice; length: number; gain: number; pan: number; width?: number} {
  const f = cue.notes.length ? mtof(cue.notes[0]) : 0;
  const noise = rng(seed);
  const instrument: Instrument = cue.instrument;
  switch (instrument) {
    case 'kick': {
      let phase = 0;
      return {length: 0.42, gain: 0.95, pan: 0, fn: (t) => {
        phase += TAU * (44 + 110 * Math.exp(-t * 38)) / SAMPLE_RATE;
        return Math.sin(phase) * Math.exp(-t * 8.5) + (t < 0.003 ? noise() * 0.25 * (1 - t / 0.003) : 0);
      }};
    }
    case 'hat': {
      let prev = 0;
      return {length: 0.07, gain: 0.16, pan: 0.25, fn: (t) => {
        const n = noise();
        const y = n - prev;
        prev = n;
        return y * 0.5 * Math.exp(-t * 70);
      }};
    }
    case 'bass': {
      const release = 0.06;
      return {length: noteSeconds + release, gain: 0.34, pan: 0, fn: (t) => {
        const p = TAU * f * t;
        const env = Math.min(1, t / 0.005) * (t > noteSeconds ? Math.max(0, 1 - (t - noteSeconds) / release) : 1);
        return (Math.sin(p) + 0.35 * Math.sin(2 * p) + 0.12 * Math.sin(3 * p)) * env;
      }};
    }
    case 'pad': {
      const freqs = cue.notes.map(mtof);
      const attack = 0.35;
      const release = 0.45;
      return {length: noteSeconds + release, gain: 0.055, pan: 0, width: 1, fn: (t, side) => {
        const env = Math.min(1, t / attack) * (t > noteSeconds ? Math.max(0, 1 - (t - noteSeconds) / release) : 1);
        const detune = side === 0 ? 0.9988 : 1.0012;
        let sum = 0;
        for (const fr of freqs) sum += (2 / Math.PI) * Math.asin(Math.sin(TAU * fr * detune * t));
        return sum * env;
      }};
    }
    case 'riser': {
      let low = 0;
      let phase = 0;
      return {length: noteSeconds, gain: 0.3, pan: 0, width: 0.6, fn: (t) => {
        const x = Math.min(1, t / noteSeconds);
        const k = 0.01 + 0.5 * x * x;
        low += k * (noise() - low);
        phase += TAU * (180 + 900 * x * x) / SAMPLE_RATE;
        return (low * 1.6 + Math.sin(phase) * 0.18) * x * x;
      }};
    }
    case 'impact': {
      let phase = 0;
      let low = 0;
      return {length: 1.6, gain: 0.75, pan: 0, width: 0.3, fn: (t) => {
        phase += TAU * (28 + 34 * Math.exp(-t * 5)) / SAMPLE_RATE;
        low += 0.08 * (noise() - low);
        return Math.sin(phase) * Math.exp(-t * 2.4) + low * 2.2 * Math.exp(-t * 9);
      }};
    }
    case 'pluck': {
      const tail = VOICE_TAIL.pluck;
      const length = noteSeconds + tail;
      return {length, gain: 0.2, pan: -0.2, fn: (t) => {
        let sum = 0;
        for (let k = 1; k <= 4; k++) sum += Math.sin(TAU * f * k * t) * Math.exp(-t * (7 + k * 5)) / k;
        return sum * Math.min(1, t / 0.002) * Math.min(1, (length - t) / 0.03);
      }};
    }
    case 'bell': {
      const length = noteSeconds + VOICE_TAIL.bell;
      return {length, gain: 0.14, pan: 0.3, fn: (t) => {
        const index = 2.2 * Math.exp(-t * 3);
        return Math.sin(TAU * f * t + index * Math.sin(TAU * f * 3.5 * t)) * Math.exp(-t * 2.4) * Math.min(1, t / 0.002) * Math.min(1, (length - t) / 0.03);
      }};
    }
    case 'lead': {
      const release = VOICE_TAIL.lead;
      return {length: noteSeconds + release, gain: 0.13, pan: 0, fn: (t) => {
        const p = TAU * f * t;
        const env = Math.min(1, t / 0.008) * (t > noteSeconds ? Math.max(0, 1 - (t - noteSeconds) / release) : 1);
        return (Math.sin(p) + Math.sin(3 * p) / 3 + Math.sin(5 * p) / 5) * env;
      }};
    }
  }
}

const DUCKED = new Set<Instrument>(['bass', 'pad']);
export const cueSample = (s: Score, beat: number) => Math.round(beat * beatSeconds(s) * SAMPLE_RATE);

/** Render cues into two stereo buses: structure (text-independent) and accents. */
export function renderCues(s: Score, cues: Cue[]): {structure: Stereo; accents: Stereo} {
  const n = durationInSamples(s);
  const bus = () => ({left: new Float32Array(n), right: new Float32Array(n)});
  const structure = bus();
  const accents = bus();
  const ducked = bus();
  cues.forEach((cue) => {
    const start = cueSample(s, cue.beat);
    const seed = (Math.round(cue.beat * 960) * 2654435761 + cue.instrument.length * 40503 + (cue.notes[0] ?? 0) * 97) >>> 0;
    const v = voice(cue, cue.beats * beatSeconds(s), seed);
    const target = cue.kind === 'structure' ? (DUCKED.has(cue.instrument) ? ducked : structure) : accents;
    const gain = v.gain * cue.velocity;
    const lg = gain * Math.min(1, 1 - v.pan);
    const rg = gain * Math.min(1, 1 + v.pan);
    const length = Math.min(n - start, Math.ceil(v.length * SAMPLE_RATE));
    for (let i = 0; i < length; i++) {
      const t = i / SAMPLE_RATE;
      const l = v.fn(t, 0);
      const r = v.width ? v.fn(t, 1) : l;
      target.left[start + i] += l * lg;
      target.right[start + i] += r * rg;
    }
  });
  // Sidechain: bass and pad dip after every kick, so the beat reads clearly.
  const duck = new Float32Array(n).fill(1);
  for (const cue of cues) if (cue.instrument === 'kick') {
    const start = cueSample(s, cue.beat);
    const length = Math.min(n - start, Math.round(0.3 * SAMPLE_RATE));
    for (let i = 0; i < length; i++) duck[start + i] = Math.min(duck[start + i], 1 - 0.4 * Math.exp(-i / SAMPLE_RATE * 11));
  }
  for (let i = 0; i < n; i++) {
    structure.left[i] += ducked.left[i] * duck[i];
    structure.right[i] += ducked.right[i] * duck[i];
  }
  return {structure, accents};
}

// ITU-R BS.1770-4 K-weighting at 48 kHz.
function kWeight(x: Float32Array) {
  const out = new Float64Array(x.length);
  const stages = [
    {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585]},
    {b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621]},
  ];
  let input: ArrayLike<number> = x;
  for (const {b, a} of stages) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const v = input[i];
      const o = b[0] * v + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = v; y2 = y1; y1 = o;
      y[i] = o;
    }
    input = y;
  }
  out.set(input as Float64Array);
  return out;
}

/** Integrated loudness in LUFS (gated, BS.1770-4). */
export function loudness({left, right}: Stereo) {
  const l = kWeight(left);
  const r = kWeight(right);
  const block = Math.round(0.4 * SAMPLE_RATE);
  const hop = Math.round(0.1 * SAMPLE_RATE);
  const powers: number[] = [];
  for (let start = 0; start + block <= l.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + block; i++) sum += l[i] * l[i] + r[i] * r[i];
    powers.push(sum / block);
  }
  const lufs = (p: number) => -0.691 + 10 * Math.log10(p);
  const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  const absolute = powers.filter((p) => lufs(p) > -70);
  if (!absolute.length) return -Infinity;
  const threshold = lufs(mean(absolute)) - 10;
  return lufs(mean(absolute.filter((p) => lufs(p) > threshold)));
}

/** True peak in dBTP, estimated with 4x windowed-sinc oversampling. */
export function truePeak({left, right}: Stereo) {
  const taps = 12;
  const phases = [0.25, 0.5, 0.75].map((frac) => {
    const kernel: number[] = [];
    for (let k = -taps + 1; k <= taps; k++) {
      const x = k - frac;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * x / taps);
      kernel.push(Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x) * w);
    }
    return kernel;
  });
  let peak = 0;
  for (const ch of [left, right]) for (let i = 0; i < ch.length; i++) {
    peak = Math.max(peak, Math.abs(ch[i]));
    if (Math.abs(ch[i]) < 0.5) continue;
    for (const kernel of phases) {
      let sum = 0;
      for (let k = 0; k < kernel.length; k++) {
        const j = i + k - taps + 1;
        if (j >= 0 && j < ch.length) sum += ch[j] * kernel[k];
      }
      peak = Math.max(peak, Math.abs(sum));
    }
  }
  return 20 * Math.log10(peak || 1e-12);
}

// Look-ahead peak limiter. Gain drops before a peak and recovers smoothly after it.
function limit({left, right}: Stereo) {
  const n = left.length;
  const ahead = Math.round(0.002 * SAMPLE_RATE);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    need[i] = p > LIMIT ? LIMIT / p : 1;
  }
  const release = Math.exp(-1 / (0.06 * SAMPLE_RATE));
  let g = 1;
  const gains = new Float32Array(n);
  // Minimum over the look-ahead window, so the gain is already down when the peak arrives.
  for (let i = 0; i < n; i++) {
    let target = 1;
    for (let j = i; j < Math.min(n, i + ahead); j++) if (need[j] < target) target = need[j];
    g = target < g ? target : target - (target - g) * release;
    gains[i] = g;
  }
  for (let i = 0; i < n; i++) {
    left[i] = Math.max(-LIMIT, Math.min(LIMIT, left[i] * gains[i]));
    right[i] = Math.max(-LIMIT, Math.min(LIMIT, right[i] * gains[i]));
  }
}

/** Mix and master. The gain comes from the structure bus only, so text edits never move the global level. */
export function master(s: Score, cues: Cue[]): Stereo & {gainDb: number} {
  const {structure, accents} = renderCues(s, cues);
  // The limiter takes back about as much level as the accents add, so aim the structure bus near the target.
  const base = loudness(structure);
  const gainDb = Number.isFinite(base) ? TARGET_LUFS + 0.4 - base : 0;
  const gain = 10 ** (gainDb / 20);
  const n = structure.left.length;
  const out = {left: new Float32Array(n), right: new Float32Array(n)};
  for (let i = 0; i < n; i++) {
    out.left[i] = (structure.left[i] + accents.left[i]) * gain;
    out.right[i] = (structure.right[i] + accents.right[i]) * gain;
  }
  limit(out);
  // Quantize to 16-bit so the browser preview and the WAV play identical samples.
  for (const ch of [out.left, out.right]) for (let i = 0; i < n; i++) ch[i] = Math.round(ch[i] * 32767) / 32767;
  return {...out, gainDb};
}

/** 16-bit PCM stereo WAV at 48 kHz. */
export function encodeWav({left, right}: Stereo): Uint8Array {
  const n = left.length;
  const bytes = new Uint8Array(44 + n * 4);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + n * 4, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    view.setInt16(44 + i * 4, Math.round(left[i] * 32767), true);
    view.setInt16(46 + i * 4, Math.round(right[i] * 32767), true);
  }
  return bytes;
}

export function decodeWav(bytes: Uint8Array): Stereo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(40, true) / 4;
  const out = {left: new Float32Array(n), right: new Float32Array(n)};
  for (let i = 0; i < n; i++) {
    out.left[i] = view.getInt16(44 + i * 4, true) / 32767;
    out.right[i] = view.getInt16(46 + i * 4, true) / 32767;
  }
  return out;
}
