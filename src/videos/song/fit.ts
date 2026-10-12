// Fit a template's song to its timing score. The score owns the timing: tempo, length, cue beats, and
// list accents. The song owns the sound. The list item count adds or removes only the item notes.
import {listCount} from '../beat/plan.ts';
import {beatPlan} from '../beat/plan.ts';
import {bpmOf, durationSeconds, totalBars, type BeatScore} from '../beat/score.ts';
import type {NoteRow, Song, SongBody, SongPart} from './engine.js';

/** A song file: an engine song plus the list item voice. Tempo and length come from the score. */
export type TemplateSong = SongBody & {
  /** Short style name shown in the editor, for example "deep house". */
  genre: string;
  /** The voice that plays each list item on its accent. Pitches go by item index (one per item, list.max of them). */
  items?: Omit<SongPart, 'notes' | 'name'> & {name?: string; pitches: (string | number)[]; steps?: number; velocity?: number};
};

/** Steps (16ths) at an absolute beat. */
export const stepOf = (beat: number) => Math.round(beat * 4 * 1000) / 1000;
export const totalSteps = (s: BeatScore) => totalBars(s) * 16;

/** The engine song for one list count: score tempo and length, plus one item note on each item accent. */
export function songFor(score: BeatScore, song: TemplateSong, count: number): Song {
  const parts: SongPart[] = song.parts.map((p) => ({...p}));
  if (song.items && score.list) {
    const {pitches, steps = 2, velocity = 0.85, name = 'items', ...part} = song.items;
    const notes: NoteRow[] = beatPlan(score, listCount(score, count)).items
      .map((it) => [stepOf(it.accent), steps, pitches[it.index % pitches.length], velocity] as NoteRow);
    // Items land exactly on the accent, so they never swing.
    parts.push({...part, name, role: 'item', swing: false, notes} as SongPart);
  }
  return {...song, bpm: bpmOf(score), length: durationSeconds(score), parts};
}
