// One function turns a score, the current text, and the hidden roles into a cue list.
// Visuals read word beats from it and the synthesizer plays it, so picture and sound cannot drift apart.
import type {Role} from '../vocab.ts';
import {SCALES, sceneStartBeat, slotStartBeat, totalBeats, type Layer, type RoleSlot, type Score, type Voice} from './score.ts';

// Role length limits, copied from vocab.ts so the browser runtime does not bundle the role patterns.
// scripts/music.test.ts checks that both lists agree.
export const ROLE_MAX: Partial<Record<Role, number>> = {brand: 18, headline: 24, subhead: 52, point1: 16, point2: 16, point3: 16, cta: 20, date: 32, stat: 12, price: 12, priceNote: 24, quote: 140, author: 40, attribution: 48};

export type Instrument = Layer | 'riser' | 'impact' | Voice;
export type Cue = {
  /** Absolute beat. */
  beat: number;
  /** Length in beats. */
  beats: number;
  instrument: Instrument;
  /** MIDI notes. Drums and noise use an empty list. */
  notes: number[];
  velocity: number;
  kind: 'structure' | 'accent' | 'response';
  /** Text role of an accent or response. */
  role?: Role;
};
export type RolePlan = {
  role: Role;
  /** Absolute beat where each word lands, one entry per word. */
  words: number[];
  /** Absolute beats of the role's accent hits. */
  hits: number[];
  /** The fixed window in absolute beats: [start, end). */
  window: [number, number];
};
export type MusicPlan = {cues: Cue[]; roles: Partial<Record<Role, RolePlan>>};

export function degreeNote(s: Score, degree: number, octave = 0) {
  const scale = SCALES[s.scale];
  const d = ((degree % 7) + 7) % 7;
  return s.root + scale[d] + 12 * (octave + Math.floor(degree / 7));
}
const chordAt = (s: Score, bar: number) => {
  const degree = s.progression[bar % s.progression.length];
  return [degree, degree + 2, degree + 4].map((d) => degreeNote(s, d));
};

/** The fixed part of the score. Text never changes these cues. */
export function structureCues(s: Score): Cue[] {
  const cues: Cue[] = [];
  const add = (cue: Omit<Cue, 'kind'>) => cues.push({...cue, kind: 'structure'});
  s.scenes.forEach((scene, i) => {
    const start = sceneStartBeat(s, i);
    for (let bar = 0; bar < scene.bars; bar++) {
      const b0 = start + bar * s.meter;
      const chord = chordAt(s, b0 / s.meter);
      if (scene.layers.includes('kick')) for (let k = 0; k < s.meter; k++) add({beat: b0 + k, beats: 0.5, instrument: 'kick', notes: [], velocity: k === 0 ? 1 : 0.85});
      if (scene.layers.includes('hat')) for (let k = 0; k < s.meter; k++) add({beat: b0 + k + 0.5, beats: 0.25, instrument: 'hat', notes: [], velocity: k % 2 ? 0.75 : 0.55});
      if (scene.layers.includes('bass')) for (const [at, len, vel] of [[0, 1, 0.9], [1.5, 0.5, 0.7], [2.5, 1, 0.75]] as const) add({beat: b0 + at, beats: len, instrument: 'bass', notes: [chord[0] - 24], velocity: vel});
      if (scene.layers.includes('pad')) add({beat: b0, beats: s.meter, instrument: 'pad', notes: chord, velocity: 0.5});
    }
  });
  for (const r of s.risers) add({beat: r.beat, beats: r.beats, instrument: 'riser', notes: [], velocity: 0.7});
  const last = Math.max(...s.impacts);
  for (const b of s.impacts) add({beat: b, beats: 2, instrument: 'impact', notes: [degreeNote(s, 0, -2)], velocity: b === last && b >= totalBeats(s) * 2 / 3 ? 1 : 0.7});
  return cues;
}

export const wordsOf = (text: string) => text.trim().split(/\s+/).filter(Boolean);
// Stable string hash, so the same words always choose the same melody.
const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const voiceOctave: Record<Voice, number> = {pluck: 1, bell: 2, lead: 1};
const MELODY = [0, 2, 4, 1, 5, 3, 6];

/** Accent hits for one role. Hits sit on eighth notes inside the fixed window. */
export function rolePlan(s: Score, slot: RoleSlot, text: string): {plan: RolePlan; cues: Cue[]} {
  const words = wordsOf(text);
  const count = Math.max(1, words.length);
  const start = slotStartBeat(s, slot);
  const end = start + slot.beats;
  const eighths = Math.round(slot.beats * 2);
  // Longer text gets fewer, shorter, wider-spaced accents so the mix stays clear.
  const density = Math.min(1, text.trim().length / (ROLE_MAX[slot.role] ?? 24));
  const maxHits = density > 0.6 ? Math.max(1, Math.min(slot.maxHits, Math.floor(eighths / 2))) : slot.maxHits;
  const hitsCount = Math.min(count, maxHits);
  let step = Math.max(1, Math.floor(eighths / hitsCount));
  if (density > 0.6) step = Math.max(2, step);
  step = Math.min(step, 4);
  const hits = Array.from({length: hitsCount}, (_, i) => start + i * step * 0.5);
  const group = (w: number) => Math.floor(w * hitsCount / count);
  const words_ = Array.from({length: count}, (_, w) => hits[group(w)]);
  const length = 0.45 - 0.25 * density;
  const octave = voiceOctave[slot.voice];
  const seed = hash(slot.role + ":" + text.trim().toLowerCase());
  const cues: Cue[] = hits.map((beat, i) => ({
    beat, beats: length, instrument: slot.voice, notes: [degreeNote(s, MELODY[(seed + i * 3) % 7], octave)],
    velocity: i === 0 ? 0.8 : 0.62 - 0.12 * density, kind: 'accent', role: slot.role,
  }));
  // A short two-note answer when the window has a free beat after the last hit.
  const free = hits[hits.length - 1] + step * 0.5;
  if (end - free >= 1) {
    const base = seed % 3;
    cues.push({beat: end - 1, beats: 0.25, instrument: slot.voice, notes: [degreeNote(s, base + 4, octave)], velocity: 0.42, kind: 'response', role: slot.role});
    cues.push({beat: end - 0.5, beats: 0.4, instrument: slot.voice, notes: [degreeNote(s, base + 2, octave)], velocity: 0.38, kind: 'response', role: slot.role});
  }
  return {plan: {role: slot.role, words: words_, hits, window: [start, end]}, cues};
}

export function musicPlan(s: Score, texts: Partial<Record<Role, string>>, hidden: readonly Role[] = []): MusicPlan {
  const cues = structureCues(s);
  const roles: MusicPlan['roles'] = {};
  for (const slot of s.slots) {
    if (hidden.includes(slot.role)) continue;
    const result = rolePlan(s, slot, texts[slot.role] ?? '');
    roles[slot.role] = result.plan;
    cues.push(...result.cues);
  }
  cues.sort((a, b) => a.beat - b.beat || a.instrument.localeCompare(b.instrument) || (a.notes[0] ?? 0) - (b.notes[0] ?? 0));
  return {cues, roles};
}

/** Hidden roles must be unique optional roles of this score. */
export function hiddenError(s: Score, hidden: unknown): string | null {
  if (!Array.isArray(hidden)) return 'hidden must be a list of roles.';
  if (new Set(hidden).size !== hidden.length) return 'hidden lists a role twice.';
  const bad = hidden.find((r) => !s.optional.includes(r as Role));
  return bad === undefined ? null : `${String(bad)} cannot be hidden. Optional roles: ${s.optional.join(', ') || 'none'}.`;
}
