// Shared gates for music templates. Used by unit tests, export checks, and the direction gate.
import {musicPlan} from '../src/videos/music/cues.ts';
import {SAMPLE_RATE, beatSeconds, durationInSamples, durationSeconds, scoreRoles, totalBeats, type Score} from '../src/videos/music/score.ts';
import {CEILING_DBTP, TARGET_LUFS, VOICE_TAIL, loudness, renderCues, truePeak, type Stereo} from '../src/videos/music/synth.ts';
import {ROLES, type Role} from '../src/videos/vocab.ts';

export const ONSET_TOLERANCE = 0.010;
export const LUFS_TOLERANCE = 1;

/** Interleaved little-endian float32 stereo (ffmpeg -f f32le) to two channels. */
export function fromF32(bytes: Buffer): Stereo {
  const n = Math.floor(bytes.length / 8);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) { left[i] = bytes.readFloatLE(i * 8); right[i] = bytes.readFloatLE(i * 8 + 4); }
  return {left, right};
}

// The kick's first 60 ms, rendered alone. A matched filter finds it inside a full mix.
let kickTemplate: Float32Array | null = null;
function kick() {
  if (kickTemplate) return kickTemplate;
  const s: Score = {bpm: 120, meter: 4, fps: 30, root: 57, scale: 'minor', progression: [0],
    scenes: [{type: 'title-reveal', bars: 1, focusBeat: 0, roles: [], layers: ['kick']}], slots: [], optional: [], risers: [], impacts: [3]};
  const bus = renderCues(s, musicPlan(s, {}).cues.filter((c) => c.instrument === 'kick' && c.beat === 0)).structure;
  kickTemplate = bus.left.slice(0, Math.round(0.02 * SAMPLE_RATE));
  return kickTemplate;
}

/** Kick onset near `t`: the lag within +-30 ms where the mix best matches the kick waveform (normalized cross-correlation). */
export function onsetNear(mono: Float32Array, t: number) {
  const k = kick();
  let kk = 0;
  for (const x of k) kk += x * x;
  const center = Math.round(t * SAMPLE_RATE);
  const span = Math.round(0.03 * SAMPLE_RATE);
  const corr = (lag: number) => {
    let dot = 0;
    let mm = 0;
    for (let i = 0; i < k.length; i++) { dot += mono[lag + i] * k[i]; mm += mono[lag + i] * mono[lag + i]; }
    return dot / Math.sqrt(kk * mm + 1e-12);
  };
  const lo = Math.max(0, center - span);
  const hi = Math.min(mono.length - k.length, center + span);
  let best = center;
  let bestScore = -Infinity;
  // Coarse search every 8 samples (0.17 ms), then refine around the best lag.
  for (let lag = lo; lag <= hi; lag += 8) { const c = corr(lag); if (c > bestScore) { bestScore = c; best = lag; } }
  for (let lag = Math.max(lo, best - 8); lag <= Math.min(hi, best + 8); lag++) { const c = corr(lag); if (c > bestScore) { bestScore = c; best = lag; } }
  return best / SAMPLE_RATE;
}

/** Audio gates on a final mix: start, length, beat onsets, clipping, and loudness. */
export function audioErrors(score: Score, data: Stereo | Buffer, {decoded = false} = {}): string[] {
  const mix = Buffer.isBuffer(data) ? fromF32(data) : data;
  const errors: string[] = [];
  const want = durationInSamples(score);
  // AAC adds up to one frame of padding at the end; the PCM WAV must match exactly.
  const slack = decoded ? 2048 : 0;
  if (Math.abs(mix.left.length - want) > slack) errors.push(`audio has ${mix.left.length} samples, score needs ${want}`);
  // Audio starts at zero: the first kick (beat 0) must start in the first 10 ms.
  const mono = new Float32Array(mix.left.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (mix.left[i] + mix.right[i]) / 2;
  const first = mono.findIndex((x) => Math.abs(x) > 1e-3);
  if (first < 0 || first / SAMPLE_RATE > ONSET_TOLERANCE) errors.push(`audio starts at ${(first / SAMPLE_RATE).toFixed(3)} s, not on the first beat`);
  // Every kick lands within 10 ms of its beat.
  const kicks = musicPlan(score, {}).cues.filter((c) => c.instrument === 'kick');
  const worst = kicks.reduce((max, c) => {
    const t = c.beat * beatSeconds(score);
    return Math.max(max, Math.abs(onsetNear(mono, t) - t));
  }, 0);
  if (worst > ONSET_TOLERANCE) errors.push(`a beat onset is ${(worst * 1000).toFixed(1)} ms off the grid`);
  const clipped = mono.length && [mix.left, mix.right].reduce((n, ch) => n + ch.filter((x) => Math.abs(x) >= 0.9999).length, 0);
  if (clipped) errors.push(`${clipped} clipped samples`);
  const tp = truePeak(mix);
  // Decoded AAC can overshoot by a fraction of a dB; the master itself must stay under the ceiling.
  if (tp > CEILING_DBTP + (decoded ? 0.5 : 0)) errors.push(`true peak ${tp.toFixed(2)} dBTP is above ${CEILING_DBTP} dBTP`);
  const lufs = loudness(mix);
  if (Math.abs(lufs - TARGET_LUFS) > LUFS_TOLERANCE) errors.push(`loudness ${lufs.toFixed(2)} LUFS is outside ${TARGET_LUFS} +-${LUFS_TOLERANCE}`);
  return errors;
}

/** Text samples for gate sheets: short (one word), typical (preset), and max length (real words). */
export function textSet(kind: 'short' | 'typical' | 'max', role: Role, preset: string) {
  const def = ROLES[role] as {max: number; pattern?: RegExp};
  if (kind === 'typical' || def.pattern) return preset;
  if (kind === 'short') return preset.split(/\s+/)[0];
  const words = 'Northwind Studio Weekly Creative Session Launch Report Insight Better Design Signal Moment'.split(' ');
  let s = '';
  for (let i = 0; s.length < def.max; i++) s += (s ? ' ' : '') + words[i % words.length];
  return s.slice(0, def.max).trim();
}

/** Every subset of optional roles, including none and all. */
export function hiddenSets(score: Score): Role[][] {
  return Array.from({length: 2 ** score.optional.length}, (_, mask) => score.optional.filter((_, i) => mask & (1 << i)));
}

/**
 * Text edits may change audio only inside the edited role's accent window plus its voice tail.
 * Compares the accent-free structure bus of two edits and the accent bus outside the window.
 */
export function editLeakErrors(score: Score, base: Partial<Record<Role, string>>, role: Role, value: string): string[] {
  const errors: string[] = [];
  const a = musicPlan(score, base);
  const b = musicPlan(score, {...base, [role]: value});
  const structure = (p: typeof a) => JSON.stringify(p.cues.filter((c) => c.kind === 'structure'));
  if (structure(a) !== structure(b)) errors.push(`editing ${role} changed the structure cues`);
  const slot = score.slots.find((s) => s.role === role)!;
  const others = (p: typeof a) => JSON.stringify(p.cues.filter((c) => c.kind !== 'structure' && c.role !== role));
  if (others(a) !== others(b)) errors.push(`editing ${role} changed another role's accents`);
  const window = b.roles[role]!.window;
  for (const c of b.cues.filter((x) => x.role === role)) {
    if (c.beat < window[0] || c.beat + c.beats > window[1] + 1e-9) errors.push(`${role} accent at beat ${c.beat} is outside its window`);
    if (Math.round(c.beat * 2) !== c.beat * 2) errors.push(`${role} accent at beat ${c.beat} is off the eighth-note grid`);
  }
  if (b.roles[role]!.hits.length > slot.maxHits) errors.push(`${role} has more than ${slot.maxHits} hits`);
  // Sample check: the accent bus differs only inside [window start, window end + tail].
  const ra = renderCues(score, a.cues).accents;
  const rb = renderCues(score, b.cues).accents;
  const lo = Math.floor(window[0] * beatSeconds(score) * SAMPLE_RATE);
  const hi = Math.ceil((window[1] * beatSeconds(score) + VOICE_TAIL[slot.voice] + 0.05) * SAMPLE_RATE);
  for (let i = 0; i < ra.left.length; i++) {
    if (i >= lo && i <= hi) continue;
    if (Math.abs(ra.left[i] - rb.left[i]) > 1e-6 || Math.abs(ra.right[i] - rb.right[i]) > 1e-6) {
      errors.push(`editing ${role} changed audio at ${(i / SAMPLE_RATE).toFixed(3)} s, outside its slot`);
      break;
    }
  }
  return errors;
}

/** Structural facts the score must keep for every edit: whole bars, frame-exact length, scene starts. */
export function structureFacts(score: Score) {
  return {bars: totalBeats(score) / score.meter, seconds: durationSeconds(score), roles: scoreRoles(score)};
}
