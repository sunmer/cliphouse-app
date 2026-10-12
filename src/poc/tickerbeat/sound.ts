// Ticker Beat sound: the existing groove plus a new split-flap preset (flap clatter, settle clack, stamp).
// Deterministic and shared by the editor preview and any export. The existing synthesizer stays unchanged.
import {structureCues, degreeNote, type Cue} from '../../videos/music/cues.ts';
import {SAMPLE_RATE, beatSeconds, durationInSamples} from '../../videos/music/score.ts';
import {loudness, renderCues, TARGET_LUFS, type Stereo} from '../../videos/music/synth.ts';
import {EVENTS, FLAP_FRAMES, FPS, SETTLE, itemBeats, tickerBeatScore as score} from './timing.ts';

export type FlapEvent = {beat: number; kind: 'clatter' | 'clack' | 'stamp' | 'sticker'; note: number; velocity: number};
/** The resolved musical plan. It depends on the item count only, never on wording. */
export type TickerPlan = {count: number; cues: Cue[]; flaps: FlapEvent[]};

// One pitch per board row, so removing an item removes its note and keeps the others.
const ROW_DEGREES = [0, 2, 4];

export function tickerPlan(count: number): TickerPlan {
  const cues = structureCues(score);
  const flaps: FlapEvent[] = [];
  const beats = itemBeats(count);
  beats.forEach((beat, i) => {
    const note = degreeNote(score, ROW_DEGREES[i] + (beats.length === 1 ? 4 : 0), 1);
    flaps.push({beat, kind: 'clatter', note, velocity: 0.8});
    flaps.push({beat: beat + SETTLE, kind: 'clack', note, velocity: 0.9});
    cues.push({beat: beat + SETTLE, beats: 0.5, instrument: 'pluck', notes: [note], velocity: 0.75, kind: 'accent', role: (['point1', 'point2', 'point3'] as const)[i]});
  });
  flaps.push({beat: EVENTS.sticker, kind: 'sticker', note: degreeNote(score, 4, 0), velocity: 0.85});
  cues.push({beat: EVENTS.sticker, beats: 1, instrument: 'bell', notes: [degreeNote(score, 4, 1)], velocity: 0.6, kind: 'accent', role: 'brand'});
  cues.push({beat: EVENTS.ctaBrand, beats: 0.5, instrument: 'lead', notes: [degreeNote(score, 0, 1)], velocity: 0.55, kind: 'accent', role: 'brand'});
  flaps.push({beat: EVENTS.ctaStamp, kind: 'stamp', note: degreeNote(score, 0, -1), velocity: 1});
  cues.push({beat: EVENTS.ctaStamp, beats: 1.5, instrument: 'lead', notes: [degreeNote(score, 4, 1)], velocity: 0.6, kind: 'accent', role: 'cta'});
  cues.sort((a, b) => a.beat - b.beat || a.instrument.localeCompare(b.instrument));
  return {count: beats.length, cues, flaps};
}

function rng(seed: number) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 0x100000000 * 2 - 1; };
}
const TAU = Math.PI * 2;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** A short filtered click, like one flap card hitting the stop. */
function click(out: Stereo, at: number, gain: number, bright: number, pan: number, seed: number) {
  const noise = rng(seed);
  const n = Math.round(0.018 * SAMPLE_RATE);
  let low = 0;
  for (let i = 0; i < n && at + i < out.left.length; i++) {
    const t = i / SAMPLE_RATE;
    low += bright * (noise() - low);
    const body = Math.sin(TAU * 1900 * t) * 0.35;
    const v = (low + body) * Math.exp(-t * 260) * gain;
    out.left[at + i] += v * (1 - pan);
    out.right[at + i] += v * (1 + pan);
  }
}

function renderFlaps(flaps: FlapEvent[], n: number): Stereo {
  const out = {left: new Float32Array(n), right: new Float32Array(n)};
  const spb = beatSeconds(score);
  for (const [k, e] of flaps.entries()) {
    const at = Math.round(e.beat * spb * SAMPLE_RATE);
    const seed = Math.round(e.beat * 960) * 2654435761 + k;
    if (e.kind === 'clatter') {
      // Cards flicker for the row's flap time: a tight run of clicks that thins out.
      const length = FLAP_FRAMES / FPS;
      for (let c = 0; c < 9; c++) {
        const t = length * (c / 9) ** 1.15;
        click(out, at + Math.round(t * SAMPLE_RATE), 0.42 * e.velocity * (1 - c / 14), 0.55, (c % 2 ? 0.25 : -0.25), seed + c);
      }
    } else if (e.kind === 'clack') {
      click(out, at, 0.9 * e.velocity, 0.35, 0, seed);
      // A woody thump under the last card.
      const f = mtof(e.note) / 2;
      const len = Math.round(0.09 * SAMPLE_RATE);
      for (let i = 0; i < len && at + i < n; i++) {
        const t = i / SAMPLE_RATE;
        const v = Math.sin(TAU * f * t) * Math.exp(-t * 45) * 0.32 * e.velocity;
        out.left[at + i] += v; out.right[at + i] += v;
      }
    } else {
      // Sticker slap and CTA stamp: a pitched body drop plus a paper snap.
      const heavy = e.kind === 'stamp';
      const noise = rng(seed);
      const len = Math.round((heavy ? 0.5 : 0.22) * SAMPLE_RATE);
      let phase = 0;
      let low = 0;
      for (let i = 0; i < len && at + i < n; i++) {
        const t = i / SAMPLE_RATE;
        phase += TAU * (mtof(e.note) * (1 + 2.5 * Math.exp(-t * 30))) / SAMPLE_RATE;
        low += 0.3 * (noise() - low);
        const v = (Math.sin(phase) * Math.exp(-t * (heavy ? 7 : 14)) * (heavy ? 0.9 : 0.5) + low * 1.4 * Math.exp(-t * 55)) * e.velocity;
        out.left[at + i] += v; out.right[at + i] += v;
      }
    }
  }
  return out;
}

// Lower than the WAV needs, so AAC encoding overshoot still stays under -1 dBTP.
const LIMIT = 10 ** (-3 / 20);
function limit({left, right}: Stereo) {
  const n = left.length;
  const ahead = Math.round(0.002 * SAMPLE_RATE);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = Math.max(Math.abs(left[i]), Math.abs(right[i])); need[i] = p > LIMIT ? LIMIT / p : 1; }
  const release = Math.exp(-1 / (0.06 * SAMPLE_RATE));
  let g = 1;
  for (let i = 0; i < n; i++) {
    let target = 1;
    for (let j = i; j < Math.min(n, i + ahead); j++) if (need[j] < target) target = need[j];
    g = target < g ? target : target - (target - g) * release;
    left[i] = Math.max(-LIMIT, Math.min(LIMIT, left[i] * g));
    right[i] = Math.max(-LIMIT, Math.min(LIMIT, right[i] * g));
  }
}

/** Mix and master. Gain comes from the fixed groove, so item counts never move the overall level. */
export function renderTicker(plan: TickerPlan): Stereo {
  const n = durationInSamples(score);
  const {structure, accents} = renderCues(score, plan.cues);
  const flaps = renderFlaps(plan.flaps, n);
  const gain = 10 ** ((TARGET_LUFS + 0.6 - loudness(structure)) / 20);
  const out = {left: new Float32Array(n), right: new Float32Array(n)};
  for (let i = 0; i < n; i++) {
    out.left[i] = (structure.left[i] + accents.left[i] + flaps.left[i]) * gain;
    out.right[i] = (structure.right[i] + accents.right[i] + flaps.right[i]) * gain;
  }
  limit(out);
  for (const ch of [out.left, out.right]) for (let i = 0; i < n; i++) ch[i] = Math.round(ch[i] * 32767) / 32767;
  return out;
}
