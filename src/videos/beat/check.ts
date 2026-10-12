// Validation rules for beat scores. Kept apart from score.ts so the browser runtime stays small.
import {ROLES, SCENE_TYPES, type Role} from '../vocab.ts';
import {BEAT_FRAMES, GENRES, HITS, METER, SCALES, VOICES, sceneStartBeat, totalBeats, type BeatScore} from './score.ts';

const eighth = (n: number) => Number.isInteger(n * 2);
const sixteenth = (n: number) => Number.isInteger(n * 4);
const REQUIRED: Role[] = ['brand'];

/** Every rule a score must satisfy. An empty list means the score is valid. */
export function scoreErrors(s: BeatScore): string[] {
  const e: string[] = [];
  if (!(BEAT_FRAMES as readonly number[]).includes(s.beatFrames)) e.push(`beatFrames must be one of ${BEAT_FRAMES.join(', ')}`);
  if (!s.scenes.length) e.push('score needs at least one scene');
  const total = totalBeats(s);
  s.scenes.forEach((scene, i) => {
    if (!Object.hasOwn(SCENE_TYPES, scene.type)) e.push(`scene ${i}: unknown type ${scene.type}`);
    if (!Number.isInteger(scene.bars) || scene.bars < 1) e.push(`scene ${i}: bars must be a whole number`);
    if (!eighth(scene.focusBeat) || scene.focusBeat < sceneStartBeat(s, i) || scene.focusBeat >= sceneStartBeat(s, i + 1)) e.push(`scene ${i}: focusBeat ${scene.focusBeat} is outside the scene (absolute beats)`);
    if (![0, 1, 2, 3].includes(scene.energy)) e.push(`scene ${i}: energy must be 0-3`);
    for (const r of scene.roles) if (!Object.hasOwn(ROLES, r)) e.push(`scene ${i}: unknown role ${r}`);
    if (new Set(scene.roles).size !== scene.roles.length) e.push(`scene ${i}: a role repeats`);
  });
  if (!s.scenes.some((sc) => sc.energy === 3)) e.push('one scene must reach energy 3');
  const roles = new Set(s.scenes.flatMap((sc) => sc.roles));
  for (const r of REQUIRED) if (!roles.has(r)) e.push(`${r} must appear in a scene`);
  const ids = new Set<string>();
  for (const c of s.cues) {
    if (ids.has(c.id)) e.push(`cue ${c.id} repeats`);
    ids.add(c.id);
    if (!/^[a-z][a-zA-Z0-9]*$/.test(c.id)) e.push(`cue ${c.id}: use a camelCase id`);
    if (!eighth(c.beat) || c.beat < 0 || c.beat >= total) e.push(`cue ${c.id}: beat ${c.beat} is off the eighth grid or outside the score`);
    if (![...HITS, ...VOICES].includes(c.sound as never)) e.push(`cue ${c.id}: unknown sound ${c.sound}`);
    if (c.role && !roles.has(c.role)) e.push(`cue ${c.id}: role ${c.role} is not in a scene`);
  }
  if (!s.cues.some((c) => c.beat >= total * 2 / 3 && ['impact', 'stamp', 'crash', 'stab'].includes(c.sound))) e.push('one impact, stamp, crash, or stab cue must sit in the last third');
  for (const r of s.risers) if (!eighth(r.beat) || r.beat < 0 || r.beats < 1 || r.beat + r.beats > total) e.push('riser is outside the score');
  if (s.list) {
    const l = s.list;
    if (l.role !== 'list') e.push('list.role must be "list"');
    if (!s.scenes[l.scene]) e.push(`list.scene ${l.scene} does not exist`);
    if (!Number.isInteger(l.min) || !Number.isInteger(l.max) || l.min < 1 || l.max < l.min || l.max > 8) e.push('list min and max must be whole numbers with 1 <= min <= max <= 8');
    if (l.itemMax < 4 || l.itemMax > 48) e.push('list.itemMax must be 4-48');
    if (!sixteenth(l.accentOffset) || l.accentOffset < 0 || l.accentOffset > 2) e.push('list.accentOffset must be 0-2 beats on the sixteenth grid');
    if (![...HITS, ...VOICES].includes(l.voice as never)) e.push(`list.voice ${l.voice} is unknown`);
    const from = sceneStartBeat(s, l.scene);
    const to = sceneStartBeat(s, l.scene + 1);
    for (let n = l.min; n <= l.max; n++) {
      const sch = l.schedules[String(n)];
      if (!sch || sch.length !== n) { e.push(`list.schedules["${n}"] must list ${n} start beats`); continue; }
      sch.forEach((b, i) => {
        if (!eighth(b)) e.push(`list.schedules["${n}"][${i}] is off the eighth grid`);
        if (b < from || b + l.accentOffset >= to) e.push(`list.schedules["${n}"][${i}] (beat ${b}) is outside the list scene, beats ${from}-${to}`);
        if (i && b <= sch[i - 1]) e.push(`list.schedules["${n}"] must rise`);
      });
      // Every item needs 30 still frames (2 beats at 120 BPM) before the scene ends.
      if (sch.length && to - (sch.at(-1)! + l.accentOffset) < 2) e.push(`list.schedules["${n}"]: the last item lands under 2 beats before the scene ends`);
    }
    for (const k of Object.keys(l.schedules)) if (Number(k) < l.min || Number(k) > l.max) e.push(`list.schedules has an extra count ${k}`);
  }
  const d = s.sound;
  if (!d) return e;
  if (!(GENRES as readonly string[]).includes(d.genre)) e.push(`unknown genre ${d.genre}`);
  if (!Number.isInteger(d.seed) || d.seed < 0) e.push('sound.seed must be a positive whole number');
  if (!Number.isInteger(d.root) || d.root < 33 || d.root > 45) e.push('sound.root must be a MIDI note from 33 to 45');
  if (!Object.hasOwn(SCALES, d.scale)) e.push('unknown scale');
  if (!d.progression.length || d.progression.length > 8 || d.progression.some((x) => !Number.isInteger(x) || x < 0 || x > 6)) e.push('progression must list 1-8 scale degrees 0-6');
  const unit = (v: number, name: string) => { if (!(v >= 0 && v <= 1)) e.push(`${name} must be 0-1`); };
  if (!(d.swing >= 0 && d.swing <= 0.33)) e.push('swing must be 0-0.33');
  if (!(d.kick.pitch >= 40 && d.kick.pitch <= 62)) e.push('kick.pitch must be 40-62 Hz');
  unit(d.kick.punch, 'kick.punch'); unit(d.kick.decay, 'kick.decay'); unit(d.hats.open, 'hats.open'); unit(d.hats.tone, 'hats.tone');
  unit(d.bass.cutoff, 'bass.cutoff'); unit(d.bass.resonance, 'bass.resonance'); unit(d.bass.drive, 'bass.drive');
  unit(d.chords.brightness, 'chords.brightness'); unit(d.space, 'space'); unit(d.pump, 'pump');
  void METER;
  return e;
}
