// Export beat templates through the real server render path (silent video + muxed score) for every list count,
// and check streams, sync, onsets, and loudness on the decoded result.
// Usage: node --import tsx scripts/beat-export.mjs [template ...]   (needs `node scripts/build-share.mjs` first)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateShare} from '../server/model.ts';
import {renderVideo} from '../server/render.ts';
import {probe, syncErrors} from '../server/audio.ts';
import {scoreOf} from '../src/videos/beat/schema.ts';
import {parseLines} from '../src/videos/beat/list.ts';
import {beatAudioErrors, fromF32} from './beat-gates.ts';

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
const outDir = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-beat-export-'));
fs.mkdirSync(outDir, {recursive: true});
const only = new Set(process.argv.slice(2));
let failed = 0;
for (const t of manifest.templates.filter((t) => (!only.size || only.has(t.id)))) {
  const variant = manifest.variants.find((v) => v.template === t.id && !v.hidden);
  const base = validateShare({variantId: variant.id, props: variant.props, templateVersion: 1});
  const score = scoreOf(base.meta);
  if (!score) continue;
  const items = parseLines(variant.props.texts.list ?? '');
  // Every list count, from the full preset down to the minimum.
  const counts = score.list ? Array.from({length: items.length - score.list.min + 1}, (_, k) => items.length - k) : [0];
  for (const n of counts) {
    const props = score.list ? {...variant.props, texts: {...variant.props.texts, list: items.slice(0, n).join('\n')}} : variant.props;
    const value = {...validateShare({variantId: variant.id, props, templateVersion: 1}), composition: t.id};
    const t0 = Date.now();
    const {video, cleanup} = await renderVideo(value);
    const target = path.join(outDir, `${variant.id}-${n}.mp4`);
    fs.copyFileSync(video, target);
    await cleanup();
    const errors = [...syncErrors(await probe(target), score)];
    const pcm = path.join(outDir, `${variant.id}-${n}.f32`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', target, '-f', 'f32le', '-ac', '2', '-ar', '48000', pcm]);
    errors.push(...beatAudioErrors(score, fromF32(fs.readFileSync(pcm)), n, {decoded: true}));
    fs.rmSync(pcm);
    console.log(`${errors.length ? 'FAIL' : 'ok  '} ${t.id} ${n} items ${((Date.now() - t0) / 1000).toFixed(1)} s ${target}${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
    if (errors.length) failed++;
  }
}
if (failed) process.exitCode = 1;
