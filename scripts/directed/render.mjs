// Render pilot review material for catalog templates.
// Usage: node scripts/directed/render.mjs <out-dir> <video|beats> <template> [...]
//   video: full-size MP4 with the catalog variant props.
//   beats: one still per beat (120 BPM) and max-length stills at each scene focus,
//          tiled into beats.png and stress.png for review.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {templateMeta} from '../../src/videos/meta.ts';
import {ROLES} from '../../src/videos/vocab.ts';

const root = path.resolve(import.meta.dirname, '../..');
const [outDir, mode, ...ids] = process.argv.slice(2);
if (!outDir || !['video', 'beats'].includes(mode) || !ids.length) throw new Error('Usage: render.mjs <out-dir> <video|beats> <template> [...]');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'));

function findBrowser() {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (!fs.existsSync(cache)) return null;
  for (const d of fs.readdirSync(cache).filter((x) => x.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const exe = path.join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

// Longest allowed text per role, built from real words so wrapping behaves like user copy.
export function longText(role, sample) {
  const max = ROLES[role].max;
  if (ROLES[role].pattern) return sample;
  const words = 'Northwind Studio Weekly Creative Session Launch Report Insight Better Design Signal Moment'.split(' ');
  let s = '';
  for (let i = 0; s.length < max; i++) s += (s ? ' ' : '') + words[i % words.length];
  return s.slice(0, max).trim();
}

function tile(files, cols, output) {
  // Pad each still with a white gutter, then tile the stills in frame order (left to right, top to bottom).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
  const labeled = files.map(([file], i) => {
    const out = path.join(tmp, `${String(i).padStart(3, '0')}.png`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf', 'pad=iw+8:ih+8:4:4:white', out]);
    return out;
  });
  if (labeled.length === 1) fs.copyFileSync(labeled[0], output);
  else {
    const pos = (n, key) => (n ? Array.from({length: n}, (_, k) => `${key}${k}`).join('+') : '0');
    const layout = labeled.map((_, i) => `${pos(i % cols, 'w')}_${pos(Math.floor(i / cols), 'h')}`).join('|');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...labeled.flatMap((f) => ['-i', f]), '-filter_complex',
      `xstack=inputs=${labeled.length}:layout=${layout}:fill=white`, output]);
  }
  fs.rmSync(tmp, {recursive: true, force: true});
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const browserExecutable = findBrowser();
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/remotion/index.ts')});
  for (const id of ids) {
    const variant = manifest.variants.find((v) => v.template === id);
    const meta = templateMeta[id];
    const dir = path.join(outDir, id);
    fs.mkdirSync(dir, {recursive: true});
    const composition = await selectComposition({serveUrl, id, inputProps: variant.props, browserExecutable});
    if (mode === 'video') {
      await renderMedia({composition, serveUrl, inputProps: variant.props, browserExecutable, codec: 'h264', crf: 18, muted: true,
        outputLocation: path.join(dir, `${variant.id}.mp4`)});
      console.log('video', path.join(dir, `${variant.id}.mp4`));
      continue;
    }
    // 120 BPM at 30 fps is one beat every 15 frames. Long templates sample at most about 24 stills.
    const step = Math.max(15, Math.ceil(meta.durationInFrames / 24 / 15) * 15);
    const beats = [];
    for (let f = 0; f < meta.durationInFrames; f += step) beats.push(f);
    beats.push(meta.durationInFrames - 1);
    const scale = 480 / Math.max(composition.width, composition.height);
    // Remotion renders the props resolved by selectComposition, so select once per prop set.
    const selected = new Map([[variant.props, composition]]);
    const still = async (props, frame, name) => {
      if (!selected.has(props)) selected.set(props, await selectComposition({serveUrl, id, inputProps: props, browserExecutable}));
      const output = path.join(dir, name);
      await renderStill({composition: selected.get(props), serveUrl, inputProps: props, frame, scale, browserExecutable, output});
      return output;
    };
    const beatFiles = [];
    for (const f of beats) beatFiles.push([await still(variant.props, f, `beat-${String(f).padStart(3, '0')}.png`), `frame ${f}`]);
    tile(beatFiles, 6, path.join(dir, 'beats.png'));
    const long = {...variant.props, texts: Object.fromEntries(Object.entries(variant.props.texts).map(([r, v]) => [r, longText(r, v)]))};
    const stressFiles = [];
    for (const s of meta.scenes) stressFiles.push([await still(long, s.from + s.focus, `stress-${s.from + s.focus}.png`), `max length, frame ${s.from + s.focus}`]);
    tile(stressFiles, Math.min(3, stressFiles.length), path.join(dir, 'stress.png'));
    console.log('beats', dir, beats.length, 'stills');
  }
}
