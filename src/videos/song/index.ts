// Public entry for template music: a timing score plus the template's song in, a mastered mix out.
// Templates without an approved song have no music: the editor, export, and source packages stay silent.
import type {VideoProps} from '../vocab.ts';
import type {TemplateMeta} from '../vocab.ts';
import {listItems} from '../beat/list.ts';
import {listCount} from '../beat/plan.ts';
import {SAMPLE_RATE, durationInSamples, type BeatScore} from '../beat/score.ts';
import {scoreOf, songDataOf} from '../beat/schema.ts';
import {encodeWav as encode, renderSong, SR} from './engine.js';
import {songFor, type TemplateSong} from './fit.ts';

export type Stereo = {left: Float32Array; right: Float32Array};
export type {TemplateSong} from './fit.ts';
export {songFor} from './fit.ts';
export const TARGET_LUFS = -14;
export const CEILING_DBTP = -1;
if (SR !== SAMPLE_RATE) throw new Error(`Song engine runs at ${SR} Hz, the export needs ${SAMPLE_RATE} Hz.`);

/** The score and song of a template with music, or undefined for a silent template. */
export function musicOf(meta: TemplateMeta | undefined): {score: BeatScore; song: TemplateSong} | undefined {
  const score = scoreOf(meta);
  const song = songDataOf(meta) as TemplateSong | undefined;
  return score && song ? {score, song} : undefined;
}

/** The list item count the props show. Wording never changes the music, only this count. */
export const songCount = (score: BeatScore, props: Pick<VideoProps, 'texts'>) => score.list ? listCount(score, listItems(props).length) : 0;

/** Render and master the song for one list count. The length matches the video exactly. */
export function songAudio(score: BeatScore, song: TemplateSong, count: number): Stereo {
  const r = renderSong(songFor(score, song, count));
  const n = durationInSamples(score);
  const fit = (x: Float32Array) => { if (x.length === n) return x; const y = new Float32Array(n); y.set(x.subarray(0, n)); return y; };
  return {left: fit(r.L), right: fit(r.R)};
}

/** 16-bit stereo WAV with seeded dither, so the same props give the same file. */
export const songWav = (score: BeatScore, song: TemplateSong, props: Pick<VideoProps, 'texts'>) => {
  const {left, right} = songAudio(score, song, songCount(score, props));
  return new Uint8Array(encode(left, right, 7));
};

/** The cache key of a mix: changes only with the song, the timing, or the list count. */
export const songKey = (score: BeatScore, song: TemplateSong, count: number) =>
  `${hash(JSON.stringify(song))}:${hash(JSON.stringify(score))}:${score.list ? listCount(score, count) : 0}`;
const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261).toString(36);
