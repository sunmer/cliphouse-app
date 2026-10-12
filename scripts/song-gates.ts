// Audio gates for template songs, at every list count. They run whether or not the song is approved:
// a template is only "ready" when its picture passes the direction gates and its song passes these.
// Checks: length matches the video, loudness about -14 LUFS, true peak at or below -1 dBTP, no clipping,
// a transient on every kick, cue, and list accent, no swing on item notes, determinism, and that each
// count differs from the full count only by its item notes.
import {beatPlan, listCount} from '../src/videos/beat/plan.ts';
import {SAMPLE_RATE, beatSeconds, durationInSamples, totalBars, type BeatScore} from '../src/videos/beat/score.ts';
import {lufs as lufsOf, nm, truePeakDb, V} from '../src/videos/song/engine.js';
import {songAudio, songFor, CEILING_DBTP, TARGET_LUFS, type Stereo, type TemplateSong} from '../src/videos/song/index.ts';

export const LUFS_TOLERANCE = 0.5;
export const counts = (s: BeatScore) => s.list ? Array.from({length: s.list.max - s.list.min + 1}, (_, k) => s.list!.min + k) : [0];
/** Voice parameters the engine reads without a default. A missing one renders NaN. */
const REQUIRED: Record<string, string[]> = {kick: ['f0', 'f1', 'pd', 'hold', 'dec']};
/** Voices that need a note name, not null. */
const PITCHED = new Set(['drum', 'boom', 'mono', 'ep', 'pad', 'pluck', 'fmpluck', 'stab', 'organ', 'vox']);
const KEYS: Record<string, number> = {C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11};
const MODES: Record<string, number[]> = {major: [0, 2, 4, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10]};

/** Energy envelope of a band in 5 ms hops: low (kick) or full band (everything else). */
function envelope(mix: Stereo, lowpass?: number) {
  const hop = Math.round(0.005 * SAMPLE_RATE);
  const a = lowpass ? Math.exp(-2 * Math.PI * lowpass / SAMPLE_RATE) : 0;
  const out: number[] = [];
  let y = 0, prev = 0, acc = 0;
  for (let i = 0; i < mix.left.length; i++) {
    const x = (mix.left[i] + mix.right[i]) / 2;
    // Full band uses a first difference, so onsets of bright hits stand out from sustained notes.
    const v = lowpass ? (y = a * y + (1 - a) * x) : x - prev;
    prev = x;
    acc += v * v;
    if ((i + 1) % hop === 0) { out.push(acc / hop); acc = 0; }
  }
  return out;
}
const rise = (env: number[], seconds: number) => {
  const at = Math.round(seconds / 0.005);
  // A hit at the very start has nothing before it, so it only needs to be clearly audible.
  if (at < 2) return Math.max(...env.slice(0, 4), 0) > 1e-7 ? Infinity : 0;
  const before = Math.max(...env.slice(Math.max(0, at - 6), at - 1), 1e-12);
  const after = Math.max(...env.slice(at, at + 4), 0);
  return after / before;
};

/** Problems with one rendered mix. `decoded` allows for AAC padding and overshoot. */
export function mixErrors(s: BeatScore, mix: Stereo, {decoded = false} = {}): string[] {
  const e: string[] = [];
  const want = durationInSamples(s);
  if (Math.abs(mix.left.length - want) > (decoded ? 2048 : 0)) e.push(`audio has ${mix.left.length} samples, the video needs ${want}`);
  const tp = truePeakDb(mix.left, mix.right);
  if (tp > CEILING_DBTP + (decoded ? 0.5 : 0)) e.push(`true peak ${tp.toFixed(2)} dBTP is above ${CEILING_DBTP} dBTP`);
  const lu = lufsOf(mix.left, mix.right);
  if (Math.abs(lu - TARGET_LUFS) > LUFS_TOLERANCE + (decoded ? 0.5 : 0)) e.push(`loudness ${lu.toFixed(2)} LUFS is outside ${TARGET_LUFS} +-${LUFS_TOLERANCE}`);
  let clipped = 0;
  for (const ch of [mix.left, mix.right]) for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) >= 0.9999) clipped++;
  if (clipped) e.push(`${clipped} clipped samples`);
  return e;
}

/** Problems with the song's note data against the timing plan, before any audio. */
export function noteErrors(s: BeatScore, song: TemplateSong): string[] {
  const e: string[] = [];
  const steps = totalBars(s) * 16;
  if (!Array.isArray(song.parts) || !song.parts.length) return ['song has no parts'];
  const [root, mode] = String(song.key ?? '').split(' ');
  const scale = KEYS[root] !== undefined && MODES[mode?.toLowerCase()] ? MODES[mode.toLowerCase()].map((i) => (KEYS[root] + i) % 12) : null;
  if (!scale) e.push(`key "${song.key}" must read like "D minor" or "A dorian"`);
  else if (JSON.stringify([...song.scale].sort((a, b) => a - b)) !== JSON.stringify([...scale].sort((a, b) => a - b))) e.push(`scale ${JSON.stringify(song.scale)} does not match "${song.key}" (${JSON.stringify(scale)})`);
  for (const p of song.parts) {
    if (!(p.inst in V) && p.inst !== 'rumble') { e.push(`${p.name}: unknown voice "${p.inst}"`); continue; }
    const missing = (REQUIRED[p.inst] ?? []).filter((k) => typeof p.p?.[k] !== 'number');
    if (missing.length) e.push(`${p.name}: the ${p.inst} voice needs p.${missing.join(', p.')}`);
    if (p.pk === undefined && p.lu === undefined) e.push(`${p.name}: set a level with pk (kick, boom) or lu (everything else)`);
    const outKey: string[] = [];
    for (const n of p.notes) {
      if (n[2] == null) { if (PITCHED.has(p.inst)) { e.push(`${p.name}: the ${p.inst} voice needs a note name on every row`); break; } continue; }
      let midi: number;
      try { midi = nm(n[2]); } catch { e.push(`${p.name}: bad note ${n[2]}`); break; }
      if (scale && !scale.includes(((midi % 12) + 12) % 12)) outKey.push(String(n[2]));
    }
    if (outKey.length) e.push(`${p.name}: out of key: ${[...new Set(outKey)].slice(0, 8).join(' ')}`);
  }
  if (song.items && !(song.items.inst in V)) e.push(`items: unknown voice "${song.items.inst}"`);
  if (song.items && song.items.lu === undefined) e.push('items: set a level with lu');
  if (song.items && scale) {
    const bad = song.items.pitches.filter((n) => { try { return !scale.includes(((nm(n) % 12) + 12) % 12); } catch { return true; } });
    if (bad.length) e.push(`items: pitches out of key or invalid: ${bad.join(' ')}`);
  }
  if (!song.parts.some((p) => p.inst === 'kick')) e.push('song has no kick part');
  if (song.parts.some((p) => p.role === 'item')) e.push('do not write list item notes in parts; set song.items and they follow the plan');
  if (s.list && !song.items) e.push('the template has a list, so the song needs an items voice');
  if (song.items && song.items.pitches.length < (s.list?.max ?? 0)) e.push(`items.pitches needs ${s.list!.max} pitches, one per item`);
  if (song.finalStep >= steps) e.push(`finalStep ${song.finalStep} is past the end (${steps} steps)`);
  for (const p of song.parts) for (const n of p.notes) {
    if (n[0] < 0 || n[0] >= steps) { e.push(`${p.name}: a note at step ${n[0]} is outside 0-${steps - 1}`); break; }
  }
  const leads = song.parts.filter((p) => p.role === 'lead');
  if (leads.length > 1) e.push(`${leads.length} lead parts (max 1)`);
  return e;
}

/** Every gate for a template's song, at every list count. */
export function songErrors(s: BeatScore, song: TemplateSong): string[] {
  const e = noteErrors(s, song);
  if (e.length) return e;
  const full = s.list ? s.list.max : 0;
  const parts = (n: number) => JSON.stringify(songFor(s, song, n).parts.filter((p) => p.role !== 'item'));
  for (const n of counts(s)) {
    const tag = s.list ? `${n} items: ` : '';
    if (parts(n) !== parts(full)) e.push(`${tag}the groove changes with the item count`);
    let mix: Stereo;
    try { mix = songAudio(s, song, n); } catch (err) { e.push(`${tag}render failed: ${(err as Error).message}`); continue; }
    const again = songAudio(s, song, n);
    if (mix.left.some((x, i) => x !== again.left[i])) e.push(`${tag}two renders differ`);
    e.push(...mixErrors(s, mix).map((x) => tag + x));
    if (mix.left.some((x) => !Number.isFinite(x))) { e.push(`${tag}the mix has NaN or infinite samples (a voice is missing a parameter)`); continue; }
    // A transient lands on every kick, every cue, and every list accent (within 15 ms).
    const spb = beatSeconds(s);
    const kickPart = song.parts.find((p) => p.inst === 'kick')!;
    const low = envelope(mix, 150);
    const kicks = kickPart.notes.filter((k) => k[3] >= 0.8 && k[0] < totalBars(s) * 16 - 1).map((k) => k[0] * spb / 4);
    const late = kicks.filter((t) => rise(low, t) < 1.5);
    if (kicks.length && late.length > kicks.length * 0.25) e.push(`${tag}${late.length} of ${kicks.length} kicks have no onset on their step (at ${late.map((t) => `${(t * 4 / spb).toFixed(2)}`).join(', ')} steps)`);
    const band = envelope(mix);
    const plan = beatPlan(s, listCount(s, n));
    const marks = [...s.cues.map((c) => ({what: `cue ${c.id}`, beat: c.beat})), ...plan.items.map((it) => ({what: `item ${it.index + 1}`, beat: it.accent}))];
    const silent = marks.filter((m) => rise(band, m.beat * spb) < 1.3);
    if (silent.length) e.push(`${tag}no audible hit on ${silent.map((m) => `${m.what} (beat ${m.beat})`).join(', ')}`);
  }
  return e;
}
