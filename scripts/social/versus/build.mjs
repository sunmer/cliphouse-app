// Build a model vs model social video from a spec.
// Usage: node scripts/social/versus/build.mjs scripts/social/versus/specs/<name>.json
// A clip is either {video, model, effort, cost, time} or {benchmark, entry} to read a published benchmark run:
// benchmark is a folder under src/benchmark/ with protocol.json and results.json, entry is "<model key>-<run>".
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../../..');
const specFile = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(specFile)) throw new Error('Pass a spec file, for example scripts/social/versus/specs/gta6-opus-deepseek.json.');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const name = path.basename(specFile, '.json');
const money = (v) => `$${v < 0.01 ? v.toFixed(3) : v.toFixed(2)}`;
const minutes = (ms) => `${Math.max(1, Math.round(ms / 60000))} min to generate`;

function resolve(clip) {
  if (!clip.benchmark) return {...clip, source: path.resolve(root, clip.video)};
  const dir = path.join(root, 'src/benchmark', clip.benchmark);
  const protocol = JSON.parse(fs.readFileSync(path.join(dir, 'protocol.json'), 'utf8'));
  // Published sets have results.json; unpublished ones (social cuts) are read from their local run records.
  const resultsFile = path.join(dir, 'results.json');
  const fromRecord = () => {
    const record = JSON.parse(fs.readFileSync(path.join(root, '.benchmark', protocol.id, clip.entry, 'record.json'), 'utf8'));
    if (record.status !== 'rendered') throw new Error(`${clip.benchmark}/${clip.entry} did not render.`);
    return {model: record.model, costUsd: record.costUsd, generationMs: record.calls.reduce((s, c) => s + c.generationMs, 0), finalCall: record.finalVersion};
  };
  const entry = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, 'utf8')).entries.find((e) => `${e.model}-${e.run}` === clip.entry) : fromRecord();
  if (!entry) throw new Error(`${clip.benchmark}: no entry ${clip.entry}.`);
  const model = protocol.models.find((m) => m.key === entry.model);
  // Prefer the full-quality render from the local store; fall back to the published web copy.
  const stored = path.join(root, '.benchmark', protocol.id, clip.entry, `render-${entry.finalCall}`, 'video.mp4');
  return {source: fs.existsSync(stored) ? stored : path.join(root, 'public', entry.video), model: clip.model ?? model.name, effort: clip.effort ?? model.effort,
    cost: clip.cost ?? money(entry.costUsd), time: clip.time ?? minutes(entry.generationMs)};
}

const clips = spec.clips.map(resolve);
// Clips play in sync for the length of the shortest one.
const frameCount = (file) => parseInt(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file], {encoding: "utf8"}), 10);
const clipFrames = spec.clipFrames ?? Math.min(...clips.map((c) => frameCount(c.source)));
const tmp = fs.mkdtempSync('/tmp/cliphouse-versus-');
const input = path.join(tmp, 'input');
const out = path.join(tmp, 'out');
fs.mkdirSync(path.join(input, 'public'), {recursive: true});
fs.mkdirSync(out); fs.chmodSync(out, 0o777);
const props = {title: spec.title, clipFrames, posterFrame: Math.round((spec.posterSeconds ?? 5) * 30), endFrames: Math.round((spec.endSeconds ?? 2.5) * 30),
  end: spec.end, music: spec.music ? 'music.m4a' : undefined,
  clips: clips.map((c, i) => {
    const video = `clip-${i}.mp4`;
    // Pre-scale to the tile so the renderer decodes small frames; timing is unchanged.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', c.source, '-vf', 'scale=1080:608:flags=lanczos', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '15', '-an', path.join(input, 'public', video)]);
    return {video, model: c.model, effort: c.effort, cost: c.cost, time: c.time};
  })};
if (spec.music) fs.copyFileSync(path.resolve(root, spec.music), path.join(input, 'public', 'music.m4a'));
fs.writeFileSync(path.join(input, 'props.json'), JSON.stringify(props));
for (const f of ['entry.tsx', 'Versus.tsx', 'render.mjs']) fs.copyFileSync(path.join(import.meta.dirname, f), path.join(input, f));
execFileSync('docker', ['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=512', '--memory=7g', '--cpus=4',
  '--shm-size=1g', '--tmpfs', '/tmp:rw,nosuid,size=2g', '--tmpfs', '/work:rw,nosuid,size=2g,uid=1000,gid=1000',
  '--mount', `type=bind,src=${input},dst=/input,readonly`, '--mount', `type=bind,src=${out},dst=/out`, '--entrypoint', 'sh', 'cliphouse-benchmark:1',
  '-c', 'cp /input/render.mjs /work/render.mjs && ln -s /opt/benchmark/node_modules /work/node_modules && node /work/render.mjs'], {stdio: ['ignore', 'ignore', 'inherit']});
const dest = path.join(root, 'output/social', name);
fs.mkdirSync(dest, {recursive: true});
// faststart puts the index first, so phones start playing before the whole file arrives.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(out, 'video.mp4'), '-c', 'copy', '-movflags', '+faststart', path.join(dest, `${name}.mp4`)]);
for (const f of ['cover.jpg', 'end.jpg']) fs.copyFileSync(path.join(out, f), path.join(dest, `${name}-${f}`));
fs.writeFileSync(path.join(dest, `${name}.props.json`), `${JSON.stringify(props, null, 2)}\n`);
fs.rmSync(tmp, {recursive: true, force: true});
console.log(JSON.stringify({video: path.join(dest, `${name}.mp4`), clips: props.clips.map((c) => `${c.model} ${c.cost} ${c.time}`)}));
