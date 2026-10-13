// Types for the generated song engine (engine.js). Song data is plain JSON written by the music stage.
export type NoteRow = [step: number, steps: number, note: string | number | null, velocity: number, extra?: Record<string, unknown>];
export type SongPart = {
  name: string;
  inst: string;
  notes: NoteRow[];
  p?: Record<string, unknown>;
  pk?: number;
  lu?: number;
  rev?: number;
  dly?: number;
  duck?: number;
  swing?: boolean;
  role?: 'bass' | 'chords' | 'lead' | 'item';
  [key: string]: unknown;
};
/** An engine song without tempo and length, which come from the timing score. */
export type SongBody = {
  id: string;
  title: string;
  key: string;
  scale: number[];
  finalStep: number;
  seed: number;
  swing?: number;
  fade?: number;
  sections: [string, number, number][];
  delay: Record<string, number>;
  reverb: Record<string, number>;
  master?: Record<string, unknown>;
  parts: SongPart[];
  duckRel?: number;
  retDuck?: number;
  retDuckRel?: number;
};
export type Song = SongBody & {bpm: number; length: number};
export type Rendered = {L: Float32Array; R: Float32Array; lufs: number; tp: number; report: {name: string; measured: number; gainDb: number; inMix: number}[]};
export function renderSong(song: Song, opts?: Record<string, unknown>): Rendered;
export function encodeWav(L: Float32Array, R: Float32Array, seed?: number): ArrayBuffer;
export function stepDur(song: Pick<Song, 'bpm'>): number;
export function nm(note: string | number): number;
export function lufs(L: Float32Array, R: Float32Array): number;
export function truePeakDb(L: Float32Array, R: Float32Array): number;
export function biquadRun(buf: Float32Array, type: string, f: number, q: number, gainDb: number): void;
export const SR: number;
export const V: Record<string, unknown>;
