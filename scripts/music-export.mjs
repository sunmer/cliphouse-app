// Export each music template through the real server render path (silent video + muxed score)
// and check streams, sync, beat onsets, and loudness on the result.
// Usage: node --import tsx scripts/music-export.mjs [template ...]   (needs `node scripts/build-share.mjs` first)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateShare} from '../server/model.ts';
import {renderVideo} from '../server/render.ts';
import {probe, syncErrors} from '../server/audio.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {audioErrors} from './music-gates.ts';

function findBrowser() {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (!fs.existsSync(cache)) return undefined;
  for (const d of fs.readdirSync(cache).filter((x) => x.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const exe = path.join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
    if (fs.existsSync(exe)) return exe;
  }
}
process.env.REMOTION_BROWSER ??= findBrowser() ?? '';
const outDir = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-music-export-'));
const only = new Set(process.argv.slice(2));
let failed = 0;
for (const t of manifest.templates.filter((t) => t.music && (!only.size || only.has(t.id)))) {
  const variant = manifest.variants.find((v) => v.template === t.id && !v.hidden);
  // Packages are published after these checks, so pin the unpublished template to version 1.
  const value = {...validateShare({variantId: variant.id, props: variant.props, templateVersion: 1}), composition: t.id};
  const score = scoreOf(value.meta);
  const t0 = Date.now();
  const {video, cleanup} = await renderVideo(value);
  const target = path.join(outDir, `${variant.id}.mp4`);
  fs.copyFileSync(video, target);
  await cleanup();
  const errors = [...syncErrors(await probe(target), score)];
  // Decode the muxed AAC back to PCM and run the audio gates on what a viewer hears.
  const pcm = path.join(outDir, `${variant.id}.f32`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', target, '-f', 'f32le', '-ac', '2', '-ar', '48000', pcm]);
  errors.push(...audioErrors(score, fs.readFileSync(pcm), {decoded: true}));
  fs.rmSync(pcm);
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${t.id} ${((Date.now() - t0) / 1000).toFixed(1)} s ${target}${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
  if (errors.length) failed++;
}
if (failed) process.exitCode = 1;
