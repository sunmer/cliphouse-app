import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root, validateAddition, validateResults} from './protocol.mjs';
import {validateRecovery} from './recovery.mjs';

const results = validateResults(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/results.json'), 'utf8')), path.join(root, 'public'));
const recoveries = validateRecovery(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/recovery.json'), 'utf8')), results, path.join(root, 'public'));
const additions = validateAddition(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/addition-results.json'), 'utf8')), results, path.join(root, 'public'));
const successful = [...results.entries, ...recoveries.entries, ...additions.entries].filter((entry) => entry.status === 'rendered');
if (!successful.length) throw new Error('There are no rendered submissions to audit.');
const directory = path.join(root, '.benchmark', 'media-audit');
fs.mkdirSync(directory, {recursive: true});
const audit = [];
for (const entry of successful) {
  const video = path.join(root, 'public', entry.video);
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], {encoding: 'utf8'}));
  const streams = metadata.streams.filter((stream) => stream.codec_type === 'video');
  const stream = streams[0];
  if (streams.length !== 1 || stream.width !== 1920 || stream.height !== 1080 || stream.r_frame_rate !== '30/1' || Number(stream.nb_frames) !== 360 || Math.abs(Number(metadata.format.duration) - 12) > 0.05 || metadata.streams.some((item) => item.codec_type === 'audio')) {
    throw new Error(`Incorrect format: ${entry.model}/${entry.brief}/${entry.run}`);
  }
  const name = `${entry.video.includes('/recovery-r1-') ? 'recovery-r1-' : ''}${entry.model}-${entry.brief}-${entry.run}`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', 'select=eq(n\\,30)+eq(n\\,150)+eq(n\\,300),scale=384:216,tile=3x1', '-frames:v', '1', path.join(directory, `${name}.jpg`)], {stdio: 'pipe', timeout: 30000});
  audit.push({model: entry.model, brief: entry.brief, run: entry.run, width: stream.width, height: stream.height, frames: Number(stream.nb_frames), duration: Number(metadata.format.duration), bytes: Number(metadata.format.size)});
}
fs.writeFileSync(path.join(directory, 'audit.json'), JSON.stringify(audit, null, 2));
console.log(`Verified ${audit.length} videos: 1920x1080, 30 fps, 360 frames, 12 seconds, and no audio. Contact sheets: ${directory}`);
