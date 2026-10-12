// Render one sample loop per genre for listening: node --import tsx scripts/beat-lab.ts [out-dir]
import fs from 'node:fs';
import path from 'node:path';
import {GENRES, type BeatScore, type Genre} from '../src/videos/beat/score.ts';
import {GENRE_DEFAULTS} from '../src/videos/beat/genres.ts';
import {beatPlan, hashString} from '../src/videos/beat/plan.ts';
import {encodeWav, loudness, renderBeat, truePeak} from '../src/videos/beat/synth.ts';
import {scoreErrors} from '../src/videos/beat/check.ts';

const out = process.argv[2] ?? 'output/beat-lab';
fs.mkdirSync(out, {recursive: true});
const roots: Record<Genre, number> = {'deep-house': 41, house: 38, 'tech-house': 40, techno: 33, minimal: 43, electro: 36, garage: 39, breaks: 37, disco: 45, progressive: 34};
const progs: Record<Genre, number[]> = {'deep-house': [0, 5, 3, 4], house: [0, 3, 4, 3], 'tech-house': [0, 0, 5, 6], techno: [0], minimal: [0, 3], electro: [0, 5, 6, 4], garage: [0, 5, 2, 6], breaks: [0, 6, 5, 6], disco: [0, 5, 3, 4], progressive: [0, 5, 2, 6]};
for (const genre of GENRES) {
  const g = GENRE_DEFAULTS[genre];
  const {beatFrames, scales, ...rest} = g;
  const s: BeatScore = {
    beatFrames: beatFrames[0] as BeatScore['beatFrames'],
    scenes: [
      {type: 'title-reveal', bars: 1, focusBeat: 2, roles: ['brand', 'headline'], energy: 1},
      {type: 'list', bars: 2, focusBeat: 10, roles: ['list'], energy: 2},
      {type: 'end-screen', bars: 1, focusBeat: 14, roles: ['brand', 'cta'], energy: 3},
    ],
    cues: [{id: 'brand', beat: 1, sound: 'bell', role: 'brand'}, {id: 'stamp', beat: 13, sound: 'stamp', role: 'cta'}],
    list: {role: 'list', scene: 1, min: 1, max: 3, itemMax: 16, schedules: {1: [4], 2: [4, 8], 3: [4, 6, 8]}, accentOffset: 0.5, voice: 'pluck'},
    risers: [{beat: 10, beats: 2}],
    sound: {genre, seed: hashString(genre), root: roots[genre], scale: scales[0], progression: progs[genre], ...rest},
  };
  const errs = scoreErrors(s);
  if (errs.length) throw new Error(`${genre}: ${errs.join('; ')}`);
  const t0 = Date.now();
  const mix = renderBeat(s, beatPlan(s, 3));
  fs.writeFileSync(path.join(out, `${genre}.wav`), encodeWav(mix));
  console.log(genre.padEnd(12), `${(60 * 30 / s.beatFrames).toFixed(1)} BPM`, `${loudness(mix).toFixed(1)} LUFS`, `${truePeak(mix).toFixed(2)} dBTP`, `${Date.now() - t0} ms`);
}
