// Builds the social reveal from the pre-chosen run (protocol.socialRun). Order is a seeded shuffle, recorded in tiles.json.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Usage: node build.mjs [trailer|trailer-voxel]
const root = path.resolve(import.meta.dirname, '../../../..');
const set = process.argv[2] || 'trailer';
const protocol = JSON.parse(fs.readFileSync(path.join(root, `src/benchmark/${set}/protocol.json`), 'utf8'));
const store = path.join(root, '.benchmark', protocol.id);
const seed = `${protocol.id}-reveal`;
const order = [...protocol.models].sort((a, b) => createHash('sha256').update(seed + a.key).digest('hex').localeCompare(createHash('sha256').update(seed + b.key).digest('hex')));
const tmp = fs.mkdtempSync('/tmp/cliphouse-reveal-');
const input = path.join(tmp, 'input');
const out = path.join(tmp, 'out');
fs.mkdirSync(path.join(input, 'public'), {recursive: true});
fs.mkdirSync(out); fs.chmodSync(out, 0o777);
const money = (v) => `$${v < 0.1 ? v.toFixed(3) : v.toFixed(2)}`;
const tiles = order.map((model, i) => {
  const record = JSON.parse(fs.readFileSync(path.join(store, `${model.key}-${protocol.socialRun}`, 'record.json'), 'utf8'));
  if (record.status !== 'rendered') throw new Error(`${model.key} run ${protocol.socialRun} did not render.`);
  const version = record.finalVersion ?? record.successfulAttempt;
  const video = `${model.key}.mp4`;
  // Scale to the tile size only; frames and timing are unchanged.
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(store, `${model.key}-${protocol.socialRun}`, `render-${version}`, 'video.mp4'),
    '-vf', 'scale=1080:608:flags=lanczos', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '15', '-an', path.join(input, 'public', video)]);
  return {letter: 'ABC'[i], key: model.key, video, costUsd: record.costUsd, cost: money(record.costUsd), model: model.name, effort: model.effort};
});
fs.copyFileSync(path.join(root, protocol.music.file), path.join(input, 'public', 'music.m4a'));
fs.writeFileSync(path.join(input, 'tiles.json'), JSON.stringify(tiles));
for (const f of ['entry.tsx', 'Reveal.tsx', 'render.mjs']) fs.copyFileSync(path.join(import.meta.dirname, f), path.join(input, f));
execFileSync('docker', ['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=512', '--memory=8g', '--cpus=4',
  '--shm-size=1g', '--tmpfs', '/tmp:rw,nosuid,size=2g', '--tmpfs', '/work:rw,nosuid,size=2g,uid=1000,gid=1000',
  '--mount', `type=bind,src=${input},dst=/input,readonly`, '--mount', `type=bind,src=${out},dst=/out`, '--entrypoint', 'sh', 'cliphouse-benchmark:1',
  '-c', 'cp /input/render.mjs /work/render.mjs && ln -s /opt/benchmark/node_modules /work/node_modules && node /work/render.mjs'], {stdio: 'inherit'});
const dest = path.join(root, `output/${set === 'trailer' ? 'trailer-benchmark' : `${set}-benchmark`}`);
fs.mkdirSync(dest, {recursive: true});
for (const f of ['reveal.mp4', 'reveal-poster.jpg', 'reveal-end.jpg']) fs.copyFileSync(path.join(out, f), path.join(dest, f));
fs.writeFileSync(path.join(dest, 'reveal-order.json'), `${JSON.stringify({seed, run: protocol.socialRun, tiles}, null, 2)}\n`);
fs.rmSync(tmp, {recursive: true, force: true});
console.log(JSON.stringify({out: dest, order: tiles.map((t) => `${t.letter}=${t.key} ${t.cost}`)}));
