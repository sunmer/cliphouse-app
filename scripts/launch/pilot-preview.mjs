// Render one pilot candidate's preview MP4 and poster from the source tree as it is now (the candidate is
// applied by the pipeline while this runs). Writes <dir>/preview.mp4 and <dir>/poster.jpg.
// Usage: LAUNCH_REFRESH=1 node --import tsx scripts/launch/pilot-preview.mjs <id> <dir>
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {templateMeta} from '../../src/videos/meta.ts';
import {writeHyperframesProject} from '../../server/hyperframes.ts';
import {LAUNCH} from './briefs.mjs';
import {presetProps} from './catalog.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const [id, out] = process.argv.slice(2);
const b = LAUNCH.find((x) => x.id === id);
if (!b || !out) throw new Error('Usage: pilot-preview.mjs <id> <dir>');
const meta = templateMeta[id];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cliphouse-pilot-${id}-`));
try {
  await writeHyperframesProject({template: id, props: presetProps(b), meta}, tmp);
  const full = path.join(tmp, 'full.mp4');
  execFileSync(path.join(root, 'node_modules/.bin/hyperframes'), ['render', tmp, '--variables-file', path.join(tmp, 'variables.json'), '--strict-variables', '--quality', 'standard', '--strict', '--quiet', '-o', full],
    {stdio: 'inherit', env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
  const scale = meta.width >= meta.height ? 'scale=480:-2' : 'scale=-2:480';
  fs.mkdirSync(out, {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(meta.posterFrame / meta.fps), '-i', full, '-frames:v', '1', '-vf', scale, '-q:v', '5', path.join(out, 'poster.jpg')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-an', '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'preview.mp4')]);
  // Keep the candidate's design next to its files, so publishing uses the same poster frame and motion.
  fs.writeFileSync(path.join(out, 'published-meta.ts'), fs.readFileSync(path.join(root, 'src/videos', id, 'meta.ts')));
  console.log('preview', id);
} finally { fs.rmSync(tmp, {recursive: true, force: true}); }
