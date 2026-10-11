// Render gallery posters and muted loops for HyperFrames templates.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {templateMeta} from '../src/videos/meta.ts';
import {HYPERFRAMES_TEMPLATES} from '../src/videos/engine.ts';
import {writeHyperframesProject} from '../server/hyperframes.ts';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const outDir = path.join(root, 'public/previews');

for (const variant of manifest.variants.filter((v) => HYPERFRAMES_TEMPLATES.includes(v.template) && (!only.size || only.has(v.id)))) {
  const meta = templateMeta[variant.template];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cliphouse-hf-${variant.id}-`));
  const full = path.join(dir, 'full.mp4');
  try {
    await writeHyperframesProject({template: variant.template, props: variant.props, meta}, dir);
    execFileSync(path.join(root, 'node_modules/.bin/hyperframes'), ['render', dir, '--variables-file', path.join(dir, 'variables.json'), '--strict-variables', '--quality', 'standard', '--strict', '--quiet', '-o', full], {stdio: 'inherit', env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
    const scale = meta.width >= meta.height ? 'scale=480:-2' : 'scale=-2:480';
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(meta.posterFrame / meta.fps), '-i', full, '-frames:v', '1', '-vf', scale, '-q:v', '5', path.join(outDir, `${variant.id}.jpg`)]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-an', '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(outDir, `${variant.id}.mp4`)]);
    console.log('rendered', variant.id);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
