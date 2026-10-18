// Runs inside the cliphouse-benchmark:1 image with the network off. /input holds this folder plus submission.tsx.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';

const work = '/work';
for (const name of ['entry.tsx', 'submission.tsx']) fs.copyFileSync(path.join('/input', name), path.join(work, name));
fs.copyFileSync('/opt/benchmark/font.css', path.join(work, 'font.css'));
fs.copyFileSync('/opt/benchmark/node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2', path.join(work, 'archivo.woff2'));
if (!fs.existsSync(path.join(work, 'node_modules'))) fs.symlinkSync('/opt/benchmark/node_modules', path.join(work, 'node_modules'));
fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({type: 'module'}));
execFileSync('/opt/benchmark/node_modules/.bin/tsc', [
  '--noEmit', '--jsx', 'react-jsx', '--strict', '--skipLibCheck', '--esModuleInterop',
  '--moduleResolution', 'bundler', '--module', 'ESNext', '--target', 'ES2022', '/work/entry.tsx', '/work/submission.tsx',
], {stdio: 'inherit', cwd: work, timeout: 120000});
const serveUrl = await bundle({entryPoint: '/work/entry.tsx', outDir: '/work/bundle', publicDir: null});
const browserExecutable = '/usr/bin/chromium';
const composition = await selectComposition({serveUrl, id: 'Trailer', browserExecutable});
if (composition.width !== 1920 || composition.height !== 1080 || composition.fps !== 30 || composition.durationInFrames !== 390) throw new Error('Composition changed the fixed format.');
await renderMedia({serveUrl, composition, browserExecutable, outputLocation: '/out/video.mp4', codec: 'h264', crf: 18, muted: true, concurrency: 2, timeoutInMilliseconds: 120000});
await renderStill({serveUrl, composition, browserExecutable, output: '/out/poster.jpg', frame: 360, imageFormat: 'jpeg'});
