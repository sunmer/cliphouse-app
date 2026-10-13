// One function turns a score and the list item count into the full event plan.
// The composition reads visual frames from it and the synthesizer plays its notes,
// so picture and sound cannot drift apart. Wording never changes the plan.
import type {Role} from '../vocab.ts';
import {METER, SCALES, beatFrame, sceneStartBeat, totalBeats, type BeatScore, type Hit, type Voice} from './score.ts';

export type Instrument =
  | 'kick' | 'clap' | 'snare' | 'rim' | 'hat' | 'openhat' | 'shaker' | 'conga' | 'cowbell' | 'tom'
  | 'bass' | 'chord' | 'riser' | 'crash' | 'clatter' | Hit | Voice;
export type Note = {
  /** Absolute beat, after swing. */
  beat: number;
  /** Length in beats. */
  beats: number;
  instrument: Instrument;
  /** MIDI notes. Drums and noise use an empty list. */
  notes: number[];
  velocity: number;
  /** Extra values for one instrument, for example acid accents and slides. */
  accent?: boolean;
  slide?: boolean;
  /** What the note belongs to: the groove, a fixed cue, or a list item. */
  kind: 'groove' | 'cue' | 'item';
  role?: Role;
};

export type ItemTiming = {index: number; start: number; accent: number; startFrame: number; accentFrame: number};
export type BeatPlan = {
  count: number;
  notes: Note[];
  /** Frame of each fixed cue by id. */
  cues: Record<string, number>;
  /** One entry per shown list item. */
  items: ItemTiming[];
};

export function degreeNote(s: BeatScore, degree: number, octave = 0) {
  if (!s.sound) return 60;
  const scale = SCALES[s.sound.scale];
  const d = ((degree % 7) + 7) % 7;
  return s.sound.root + scale[d] + 12 * (octave + Math.floor(degree / 7));
}

/** Deterministic random numbers in [0, 1). */
export function rng(seed: number) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}
export const hashString = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

/** The list item count, clamped to the list's limits. */
export const listCount = (s: BeatScore, count: number) => s.list ? Math.max(s.list.min, Math.min(s.list.max, Math.round(count))) : 0;

const step = (beat: number) => beat / 4;

function chordNotes(s: BeatScore, bar: number, sevenths: boolean) {
  const p = s.sound!.progression;
  const d = p[bar % p.length];
  const tones = [d, d + 2, d + 4, ...(sevenths ? [d + 6] : [])].map((x) => degreeNote(s, x, 2));
  // Keep chords in one register (A3 to G#4), so the progression voice-leads instead of jumping.
  return tones.map((n) => { let m = n; while (m < 57) m += 12; while (m >= 69) m -= 12; return m; }).sort((a, b) => a - b);
}

type Sound = NonNullable<BeatScore['sound']>;
const KICK: Record<Sound['kick']['pattern'], number[]> = {
  four: [0, 4, 8, 12], broken: [0, 6, 10], garage: [0, 7, 10], breaks: [0, 7, 10],
};
const HATS: Record<Sound['hats']['pattern'], number[]> = {
  offbeat: [2, 6, 10, 14], eighths: [0, 2, 4, 6, 8, 10, 12, 14], sixteenths: Array.from({length: 16}, (_, i) => i),
  shuffle: [2, 3, 6, 7, 10, 11, 14, 15], sparse: [2, 10],
};
const SNARE: Record<Sound['snare']['pattern'], number[]> = {backbeat: [4, 12], halftime: [8], garage: [4, 12, 15]};
const CHORD: Record<Sound['chords']['rhythm'], [number, number][]> = {
  offbeat: [[2, 1], [6, 1], [10, 1], [14, 1]], held: [[0, 16]], skank: [[4, 2], [12, 2]],
  syncopated: [[0, 2], [3, 2], [6, 2], [10, 3]], pulse: [[0, 1], [2, 1], [4, 1], [6, 1], [8, 1], [10, 1], [12, 1], [14, 1]],
};

/** The legacy groove: drums, bass, chords, risers, and scene transitions. Empty without a legacy sound design. */
function groove(s: BeatScore): Note[] {
  const out: Note[] = [];
  const d = s.sound;
  if (!d) return out;
  const swing = (st: number) => step(st + (st % 2 ? d.swing : 0));
  const sevenths = ['deep-house', 'house', 'garage', 'disco'].includes(d.genre);
  const add = (n: Omit<Note, 'kind'>) => out.push({...n, kind: 'groove'});
  let bar = 0;
  s.scenes.forEach((scene, si) => {
    const next = s.scenes[si + 1];
    const prevEnergy = si ? s.scenes[si - 1].energy : scene.energy;
    const start = sceneStartBeat(s, si);
    if (si && scene.energy === 3 && prevEnergy < 3) add({beat: start, beats: 4, instrument: 'crash', notes: [], velocity: 0.8});
    for (let b = 0; b < scene.bars; b++, bar++) {
      const b0 = start + b * METER;
      const lastBar = b === scene.bars - 1;
      // A drop: the kick rests on the last beat before a scene that raises the energy.
      const drop = lastBar && next && next.energy > scene.energy;
      const r = rng(d.seed + bar * 7919);
      const chord = chordNotes(s, bar, sevenths);
      const bassRoot = degreeNote(s, d.progression[bar % d.progression.length]);
      const e = scene.energy;
      if (e >= 1) for (const st of KICK[d.kick.pattern]) {
        if (drop && st >= 12) continue;
        add({beat: b0 + step(st), beats: 0.5, instrument: 'kick', notes: [], velocity: st === 0 ? 1 : 0.9});
      }
      if (e >= 1 && d.kick.pattern === 'breaks') add({beat: b0 + step(13), beats: 0.25, instrument: 'kick', notes: [], velocity: 0.55});
      if (e >= 1) for (const st of HATS[d.hats.pattern]) {
        const off = st % 4 === 2;
        const open = off && e >= 3 && d.hats.open > 0 && (st === 14 || d.hats.open > 0.6);
        add({beat: b0 + swing(st), beats: open ? 0.5 : 0.25, instrument: open ? 'openhat' : 'hat', notes: [],
          velocity: (st % 4 === 0 ? 0.55 : off ? 0.8 : 0.45) * (0.92 + 0.16 * r())});
      }
      if (e >= 2 && d.snare.kind !== 'none') for (const st of SNARE[d.snare.pattern]) {
        add({beat: b0 + swing(st), beats: 0.5, instrument: d.snare.kind, notes: [], velocity: st === 15 ? 0.45 : 0.9});
      }
      // A fill into the next scene: sixteenths that build on the last beat.
      if (lastBar && next && e >= 1) for (let st = 12; st < 16; st++) {
        add({beat: b0 + step(st), beats: 0.25, instrument: d.snare.kind === 'none' || e < 2 ? 'rim' : d.snare.kind === 'clap' ? 'clap' : 'snare', notes: [], velocity: 0.35 + 0.15 * (st - 12)});
      }
      if (e >= 2) {
        const bass = (st: number, len: number, note: number, vel = 0.9, extra: Partial<Note> = {}) =>
          add({beat: b0 + swing(st), beats: step(len), instrument: 'bass', notes: [note], velocity: vel, ...extra});
        switch (d.bass.pattern) {
          case 'offbeat': for (const st of [2, 6, 10, 14]) bass(st, 1.6, bassRoot); break;
          case 'rolling': for (let st = 0; st < 16; st++) if (st % 4) bass(st, 0.9, bassRoot + (st % 4 === 3 ? 12 : 0), st % 4 === 2 ? 0.95 : 0.7); break;
          case 'sub': bass(0, 7, bassRoot, 1); bass(8, 6, bassRoot, 0.9); break;
          case 'octave': for (let st = 0; st < 16; st += 2) bass(st, 1.4, bassRoot + (st % 4 ? 12 : 0), st % 4 ? 0.8 : 1); break;
          case 'syncopated': for (const [st, len] of [[0, 2], [3, 2], [6, 1.5], [10, 2], [13, 1.5]] as const) bass(st, len, st === 13 ? bassRoot + 7 : bassRoot); break;
          case 'acid': {
            // A two-bar acid line, fixed by the seed, so it repeats like a programmed sequencer.
            const line = rng(d.seed + (bar % 2) * 104729);
            for (let st = 0; st < 16; st++) {
              if (line() > 0.68) continue;
              const up = line() < 0.25 ? 12 : 0;
              const degreeShift = [0, 0, 0, 3, 5, 7, -2][Math.floor(line() * 7)];
              bass(st, 0.9, bassRoot + up + degreeShift, 0.8, {accent: line() < 0.3, slide: line() < 0.2});
            }
            break;
          }
        }
      }
      if (d.chords.voice !== 'none') {
        // Low energy holds the chord; full energy plays the genre's rhythm.
        const pattern = e === 0 || d.chords.voice === 'pad' ? CHORD.held : CHORD[d.chords.rhythm];
        for (const [st, len] of pattern) add({beat: b0 + swing(st), beats: step(len), instrument: 'chord', notes: chord, velocity: e === 0 ? 0.6 : 0.75});
      }
      if (e >= 3) switch (d.perc) {
        case 'shaker': for (let st = 0; st < 16; st++) add({beat: b0 + swing(st), beats: 0.2, instrument: 'shaker', notes: [], velocity: st % 2 ? 0.5 : 0.3}); break;
        case 'conga': for (const [st, n] of [[3, 0], [6, 1], [7, 1], [11, 2], [14, 1]] as const) add({beat: b0 + swing(st), beats: 0.5, instrument: 'conga', notes: [n], velocity: 0.6}); break;
        case 'cowbell': for (const st of [3, 11]) add({beat: b0 + swing(st), beats: 0.4, instrument: 'cowbell', notes: [], velocity: 0.45}); break;
        case 'tom': for (const st of [7, 15]) add({beat: b0 + swing(st), beats: 0.5, instrument: 'tom', notes: [0], velocity: 0.5}); break;
        case 'none': break;
      }
    }
  });
  for (const r of s.risers) add({beat: r.beat, beats: r.beats, instrument: 'riser', notes: [], velocity: 0.7});
  return out;
}

/** The full plan for one item count. */
export function beatPlan(s: BeatScore, count = s.list?.max ?? 0): BeatPlan {
  const notes = groove(s);
  const cues: Record<string, number> = {};
  const pitch = (beat: number, note?: number) => {
    if (!s.sound) return 60;
    const bar = Math.floor(beat / METER);
    const d = s.sound.progression[bar % s.sound.progression.length];
    return degreeNote(s, note ?? d + 4, 3);
  };
  for (const c of s.cues) {
    cues[c.id] = beatFrame(s, c.beat);
    notes.push({beat: c.beat, beats: 1, instrument: c.sound, notes: [pitch(c.beat, c.note)], velocity: c.velocity ?? 0.8, kind: 'cue', role: c.role});
  }
  const items: ItemTiming[] = [];
  const n = listCount(s, count);
  if (s.list && n) {
    const schedule = s.list.schedules[String(n)];
    schedule.forEach((start, i) => {
      const accent = start + s.list!.accentOffset;
      items.push({index: i, start, accent, startFrame: beatFrame(s, start), accentFrame: beatFrame(s, accent)});
      if (s.list!.voice === 'flap' && s.list!.accentOffset > 0) notes.push({beat: start, beats: s.list!.accentOffset, instrument: 'clatter', notes: [], velocity: 0.75, kind: 'item', role: 'list'});
      // Items climb the scale, so the list reads as a phrase. Removing an item removes its note.
      notes.push({beat: accent, beats: 0.5, instrument: s.list!.voice, notes: [pitch(accent, [0, 2, 4, 5, 7, 9, 11, 12][i % 8])], velocity: 0.8, kind: 'item', role: 'list'});
    });
  }
  notes.sort((a, b) => a.beat - b.beat || a.instrument.localeCompare(b.instrument));
  return {count: n, notes, cues, items};
}

/** The stable key of a plan, for caching audio by the resolved musical plan. */
export const planKey = (s: BeatScore, count: number) => `${hashString(JSON.stringify(s))}:${listCount(s, count)}`;
export {totalBeats};
