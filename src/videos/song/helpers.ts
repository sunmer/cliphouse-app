// Note-writing helpers from the synth-music-from-code skill, for song.ts files.
// A note row is [step (16th from the start), length in steps, note name or null for drums, velocity, extra].
import type {NoteRow} from './engine.js';

type Extra = Record<string, unknown> | undefined;

/** One drum pattern string (16 characters: "." rest, "1"-"9" velocity, "x" 0.8, "X" full) repeated in each listed bar. */
export function drums(barList: number[], str: string, dur = 1, extra?: Extra): NoteRow[] {
  const out: NoteRow[] = [];
  for (const b of barList) {
    for (let i = 0; i < 16; i++) {
      const c = str[i];
      if (!c || c === '.') continue;
      const v = c === 'X' ? 1 : c === 'x' ? 0.8 : parseInt(c, 10) / 9;
      out.push([b * 16 + i, dur, null, v, extra]);
    }
  }
  return out;
}
/** Rows written relative to a bar, moved to that bar. */
export const bar = (b: number, rows: NoteRow[]): NoteRow[] => rows.map((e) => { const c = e.slice() as NoteRow; c[0] += b * 16; return c; });
/** One chord: every note at the same step. */
export const chord = (b: number, step: number, dur: number, notes: (string | number)[], vel: number, extra?: Extra): NoteRow[] =>
  notes.map((n) => [b * 16 + step, dur, n, vel, extra]);
/** Several chord hits in one bar: [[step, dur, notes, vel, extra?], ...]. */
export const hits = (b: number, list: [number, number, (string | number)[], number, Extra?][]): NoteRow[] =>
  list.flatMap((h) => chord(b, h[0], h[1], h[2], h[3], h[4]));
/** Join note lists. */
export const cat = (...lists: NoteRow[][]): NoteRow[] => lists.flat();
/** Bars from `from` up to but not including `to`. */
export const bars = (from: number, to: number) => Array.from({length: Math.max(0, to - from)}, (_, i) => from + i);
