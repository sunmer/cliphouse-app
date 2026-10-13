// Audio gates for beat templates: start, length, onsets on the beat grid, peaks, loudness, determinism,
// and that every list count keeps the groove identical. Used by unit tests and the export check.
import {beatPlan, listCount} from '../src/videos/beat/plan.ts';
import {SAMPLE_RATE, beatSeconds, durationInSamples, type BeatScore} from '../src/videos/beat/score.ts';
import {CEILING_DBTP, TARGET_LUFS, loudness, renderBeat, truePeak, type Stereo} from '../src/videos/beat/synth.ts';

export const LUFS_TOLERANCE = 1;

export function fromF32(bytes: Buffer): Stereo {
  const n = Math.floor(bytes.length / 8);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) { left[i] = bytes.readFloatLE(i * 8); right[i] = bytes.readFloatLE(i * 8 + 4); }
  return {left, right};
}

/** Low-band energy envelope in 5 ms hops, for kick onset checks. */
function lowEnvelope(mix: Stereo) {
  const hop = Math.round(0.005 * SAMPLE_RATE);
  const out: number[] = [];
  let y = 0;
  const a = Math.exp(-2 * Math.PI * 150 / SAMPLE_RATE);
  let acc = 0;
  for (let i = 0; i < mix.left.length; i++) {
    y = a * y + (1 - a) * (mix.left[i] + mix.right[i]) / 2;
    acc += y * y;
    if ((i + 1) % hop === 0) { out.push(acc / hop); acc = 0; }
  }
  return out;
}

/** Audio gates on a final mix. `decoded` allows for AAC padding and overshoot. */
export function beatAudioErrors(s: BeatScore, mix: Stereo, count: number, {decoded = false} = {}): string[] {
  const errors: string[] = [];
  const want = durationInSamples(s);
  if (Math.abs(mix.left.length - want) > (decoded ? 2048 : 0)) errors.push(`audio has ${mix.left.length} samples, score needs ${want}`);
  const tp = truePeak(mix);
  if (tp > CEILING_DBTP + (decoded ? 0.5 : 0)) errors.push(`true peak ${tp.toFixed(2)} dBTP is above ${CEILING_DBTP} dBTP`);
  const lufs = loudness(mix);
  if (Math.abs(lufs - TARGET_LUFS) > LUFS_TOLERANCE) errors.push(`loudness ${lufs.toFixed(2)} LUFS is outside ${TARGET_LUFS} +-${LUFS_TOLERANCE}`);
  const clipped = [mix.left, mix.right].reduce((n, ch) => n + ch.filter((x) => Math.abs(x) >= 0.9999).length, 0);
  if (clipped) errors.push(`${clipped} clipped samples`);
  // Kick onsets: the low-band energy rises within 15 ms after every kick on the grid.
  const env = lowEnvelope(mix);
  const kicks = beatPlan(s, count).notes.filter((n) => n.instrument === 'kick' && n.velocity > 0.8);
  let late = 0;
  for (const k of kicks) {
    const at = Math.round(k.beat * beatSeconds(s) / 0.005);
    const before = Math.max(...env.slice(Math.max(0, at - 4), at - 1).concat([1e-12]));
    const after = Math.max(...env.slice(at, at + 3).concat([0]));
    if (after < before * 1.5) late++;
  }
  if (kicks.length && late > kicks.length * 0.1) errors.push(`${late} of ${kicks.length} kicks have no onset on their beat`);
  return errors;
}

/** Every list count: the groove notes are identical, and only item notes change. */
export function countErrors(s: BeatScore): string[] {
  if (!s.list) return [];
  const errors: string[] = [];
  const groove = (n: number) => JSON.stringify(beatPlan(s, n).notes.filter((x) => x.kind !== 'item'));
  const base = groove(s.list.max);
  for (let n = s.list.min; n <= s.list.max; n++) {
    if (groove(n) !== base) errors.push(`count ${n} changes the groove or cue notes`);
    const items = beatPlan(s, n).items;
    if (items.length !== listCount(s, n)) errors.push(`count ${n} plans ${items.length} items`);
  }
  return errors;
}

export const renderCount = (s: BeatScore, n: number) => renderBeat(s, beatPlan(s, n));
