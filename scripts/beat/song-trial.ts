// Check and render a trial song for a template without wiring it in: the audio gates, the mix report, a WAV,
// and the template's own preview video with the song muxed under it. The published song and meta stay as they are.
// Usage: node --import tsx scripts/beat/song-trial.ts <template> <song.ts> <out-dir>
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {templateMeta} from '../../src/videos/meta.ts';
import {scoreOf} from '../../src/videos/beat/schema.ts';
import {songAudio, type TemplateSong} from '../../src/videos/song/index.ts';
import {encodeWav} from '../../src/videos/song/engine.js';
import {counts, songErrors} from '../song-gates.ts';
import {songReport} from '../song-report.ts';

const root = path.resolve(import.meta.dirname, '../..');
const [id, file, out] = process.argv.slice(2);
if (!id || !file || !out) throw new Error('Usage: song-trial.ts <template> <song.ts> <out-dir>');
const score = scoreOf(templateMeta[id]);
if (!score) throw new Error(`${id} has no beat score`);
// Songs import '../song/helpers.ts', so load a temporary copy from inside src/videos.
const stageDir = path.join(root, 'src/videos', `.trial-${process.pid}`);
const staged = path.join(stageDir, 'song.ts');
fs.mkdirSync(stageDir, {recursive: true});
fs.copyFileSync(path.resolve(file), staged);
let song: TemplateSong;
try { song = (await import(pathToFileURL(staged).href)).default as TemplateSong; } finally { fs.rmSync(stageDir, {recursive: true, force: true}); }
fs.mkdirSync(out, {recursive: true});

let errors: string[];
try { errors = songErrors(score, song); } catch (e) { errors = [`Song failed to render: ${(e as Error).message}`]; }
const full = counts(score).at(-1)!;
const report = errors.length ? null : songReport(score, song, full);
const problems = [...errors, ...(report?.problems ?? [])];
if (report) fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

if (!errors.length) {
  const {left, right} = songAudio(score, song, full);
  const wav = path.join(out, 'song.wav');
  fs.writeFileSync(wav, Buffer.from(encodeWav(left, right, 7)));
  // The gallery preview is silent; mux the trial song under it for listening in context.
  const variant = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8')).variants.find((v: {template: string; hidden?: boolean}) => v.template === id && !v.hidden);
  const video = path.join(root, 'public/previews', `${variant.id}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(out, 'video.mp4')]);
}
console.log(JSON.stringify({id, ok: !problems.length, problems, lufs: report?.lufs, truePeak: report?.truePeak}));
if (problems.length) fs.writeFileSync(path.join(out, 'errors.txt'), `Audio gates:\n${problems.join('\n')}${report ? `\n\nMix report:\n${JSON.stringify(report)}` : ''}`);
