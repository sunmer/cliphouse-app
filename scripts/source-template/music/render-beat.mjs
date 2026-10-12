// Render this music template with sound: the engine renders silent video, then ffmpeg muxes the
// generated score as AAC 48 kHz stereo and checks that both streams line up.
// Usage: node music/render.mjs            (uses props.json or variables.json)
//        node music/render.mjs --wav-only (writes out/score.wav only)
// Needs Node 22.6 or later and ffmpeg on PATH.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {beatWav} from '../src/videos/beat/index.ts';
import {durationSeconds, bpmOf} from '../src/videos/beat/score.ts';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const score = JSON.parse(fs.readFileSync(path.join(root, 'music/score.json'), 'utf8'));
const engine = pkg.cliphouse.engine;
const out = path.join(root, 'out');
fs.mkdirSync(out, {recursive: true});

// The generator reads the texts. Only the list item count changes the music.
// Remotion keeps them in props.json, HyperFrames in variables.json (text_<role>).
function props() {
  if (engine === 'remotion') return JSON.parse(fs.readFileSync(path.join(root, 'props.json'), 'utf8'));
  const vars = JSON.parse(fs.readFileSync(path.join(root, 'variables.json'), 'utf8'));
  return {texts: Object.fromEntries(Object.entries(vars).filter(([k]) => k.startsWith('text_')).map(([k, v]) => [k.slice(5), v]))};
}

const wav = path.join(out, 'score.wav');
fs.writeFileSync(wav, beatWav(score, props()));
console.log('wrote', path.relative(root, wav));
if (process.argv.includes('--wav-only')) process.exit(0);

const silent = path.join(out, 'silent.mp4');
const run = (cmd, args) => execFileSync(cmd, args, {cwd: root, stdio: 'inherit', env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
if (engine === 'remotion') run('npx', ['remotion', 'render', 'src/index.ts', pkg.cliphouse.composition, silent, '--props=props.json', '--muted']);
else run('npx', ['--yes', 'hyperframes@0.8.146', 'render', '--variables-file', 'variables.json', '--strict-variables', '-o', silent]);

const seconds = durationSeconds(score);
const video = path.join(out, 'video.mp4');
run('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-ar', '48000', '-ac', '2', '-t', seconds.toFixed(6), '-movflags', '+faststart', video]);
const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', video]).toString()).streams;
const v = info.find((s) => s.codec_type === 'video');
const a = info.find((s) => s.codec_type === 'audio');
const off = (x, y) => Math.abs(Number(x) - Number(y));
if (!a || off(a.start_time, v.start_time) > 0.035 || off(a.duration, seconds) > 0.035 || off(v.duration, seconds) > 0.035) {
  throw new Error(`Audio and video do not line up: video ${v?.duration} s, audio ${a?.duration} s, score ${seconds} s.`);
}
fs.rmSync(silent);
console.log('wrote', path.relative(root, video), `(${seconds} s, ${bpmOf(score).toFixed(1)} BPM, AAC 48 kHz stereo)`);
