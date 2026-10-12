// Extract each music source package, render it with its own command (silent video plus muxed score),
// and check that the result reproduces the repository's duration, streams, beat timing, and WAV.
// Usage: node --import tsx scripts/music-source.test.mjs [template ...]
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import versions from '../src/videos/versions.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {musicWav} from '../src/videos/music/index.ts';
import {probe, syncErrors} from '../server/audio.ts';
import {audioErrors} from './music-gates.ts';

const root = path.resolve(import.meta.dirname, '..');
const only = new Set(process.argv.slice(2));
const sha = (b) => createHash('sha256').update(b).digest('hex');
let failed = 0;
for (const t of manifest.templates.filter((t) => t.music && (!only.size || only.has(t.id)))) {
  const {version} = versions[t.id].at(-1);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cliphouse-music-src-${t.id}-`));
  const pkg = path.join(dir, `cliphouse-${t.id}-v${version}`);
  const run = (cmd, args) => execFileSync(cmd, args, {cwd: pkg, stdio: ['ignore', 'pipe', 'inherit'], env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
  const errors = [];
  try {
    execFileSync('tar', ['xzf', path.join(root, `public/source/${t.id}/v${version}.tar.gz`), '-C', dir]);
    const score = scoreOf(templateMeta[t.id]);
    const variant = manifest.variants.find((v) => v.template === t.id && !v.hidden);
    const expected = sha(musicWav(score, variant.props));
    if (sha(fs.readFileSync(path.join(pkg, 'music/score.wav'))) !== expected) errors.push('packaged score.wav differs from the repository mix');
    if (fs.existsSync(path.join(pkg, 'package-lock.json'))) run('npm', ['ci', '--no-audit', '--no-fund']);
    run(process.execPath, ['music/render.mjs']);
    if (sha(fs.readFileSync(path.join(pkg, 'out/score.wav'))) !== expected) errors.push('package-generated WAV differs from the repository mix');
    const video = path.join(pkg, 'out/video.mp4');
    errors.push(...syncErrors(await probe(video), score));
    const info = await probe(video);
    if (Number(info.video?.nb_frames) !== templateMeta[t.id].durationInFrames) errors.push(`video has ${info.video?.nb_frames} frames, template has ${templateMeta[t.id].durationInFrames}`);
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], {maxBuffer: 256 * 1024 * 1024});
    errors.push(...audioErrors(score, pcm, {decoded: true}));
  } catch (e) { errors.push(String(e.message).split('\n')[0]); }
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${t.id} v${version}${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
  if (errors.length) failed++;
  else fs.rmSync(dir, {recursive: true, force: true});
}
if (failed) process.exitCode = 1;
