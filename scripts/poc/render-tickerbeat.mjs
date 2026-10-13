// Gate 2 review material: beat sheets for 3, 2, and 1 items, a max-length stress sheet, and MP4s with sound.
// Usage: node --import tsx scripts/poc/render-tickerbeat.mjs [sheets|video]
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {encodeWav} from '../../src/videos/music/synth.ts';
import {renderTicker, tickerPlan} from '../../src/poc/tickerbeat/sound.ts';
import {tickerBeatMeta as meta} from '../../src/poc/tickerbeat/meta.ts';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'output/poc/tickerbeat');
const mode = process.argv[2] ?? 'sheets';
fs.mkdirSync(out, {recursive: true});

const base = {texts: {brand: 'KICKLAB', headline: 'Weekend drop', point1: '30% off kicks', point2: 'Free shipping', point3: 'Ends Sunday', cta: 'Shop now'},
  theme: {background: '#111111', surface: '#262626', foreground: '#f5f5f0', accent: '#ff3b30', accent2: '#ffd60a'}, hidden: [], audio: {enabled: true}};
const withCount = (n) => ({...base, hidden: ['point1', 'point2', 'point3'].slice(n)});
const long = {...base, texts: {brand: 'NORTHWIND STUDIOS', headline: 'Weekend sale is live now', point1: 'Q&A, live! 100%', point2: 'Free shipping UK', point3: 'Ends Sunday 9pm', cta: 'Shop the drop now'}};

const entry = path.join(root, 'scripts/poc/remotion-entry.tsx');
const serveUrl = await bundle({entryPoint: entry});
const select = (props) => selectComposition({serveUrl, id: 'tickerbeat', inputProps: props});

function tile(files, cols, output) {
  const pos = (n, key) => (n ? Array.from({length: n}, (_, k) => `${key}${k}`).join('+') : '0');
  const layout = files.map((_, i) => `${pos(i % cols, 'w')}_${pos(Math.floor(i / cols), 'h')}`).join('|');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
    `${files.map((_, i) => `[${i}]pad=iw+8:ih+8:4:4:white[p${i}]`).join(';')};${files.map((_, i) => `[p${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=white`, output]);
}

if (mode === 'sheets') {
  const stills = path.join(out, 'stills');
  fs.mkdirSync(stills, {recursive: true});
  const still = async (props, frame, name) => {
    const file = path.join(stills, name);
    await renderStill({composition: await select(props), serveUrl, inputProps: props, frame, scale: 0.3, output: file});
    return file;
  };
  for (const n of [3, 2, 1]) {
    const files = [];
    for (let f = 0; f < meta.durationInFrames; f += 15) files.push(await still(withCount(n), f, `n${n}-${f}.png`));
    files.push(await still(withCount(n), meta.durationInFrames - 1, `n${n}-last.png`));
    tile(files, 6, path.join(out, `beats-${n}.png`));
  }
  const files = [];
  for (const s of meta.scenes) files.push(await still(long, s.from + s.focus, `long-${s.from}.png`));
  files.push(await still({...long, hidden: ['point2', 'point3']}, 150, 'long-one.png'));
  tile(files, 4, path.join(out, 'stress.png'));
  console.log('sheets', out);
} else {
  for (const n of [3, 2, 1]) {
    const props = withCount(n);
    const silent = path.join(out, `silent-${n}.mp4`);
    const wav = path.join(out, `score-${n}.wav`);
    const mp4 = path.join(out, `tickerbeat-${n}-items.mp4`);
    await renderMedia({composition: await select(props), serveUrl, inputProps: props, codec: 'h264', crf: 18, muted: true, outputLocation: silent});
    fs.writeFileSync(wav, encodeWav(renderTicker(tickerPlan(n))));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '8', '-movflags', '+faststart', mp4]);
    fs.rmSync(silent);
    console.log('video', mp4);
  }
}
