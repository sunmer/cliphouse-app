// Runs inside cliphouse-benchmark-3d:1 with the network off. WebGL uses ANGLE on SwiftShader (CPU), the same for every model.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';

const work = '/work';
for (const name of ['entry.tsx', 'submission.tsx']) fs.copyFileSync(path.join('/input', name), path.join(work, name));
fs.copyFileSync('/opt/benchmark/font.css', path.join(work, 'font.css'));
fs.copyFileSync('/opt/benchmark/node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2', path.join(work, 'archivo.woff2'));
fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({type: 'module'}));
execFileSync('/opt/benchmark/node_modules/.bin/tsc', [
  '--noEmit', '--jsx', 'react-jsx', '--strict', '--skipLibCheck', '--esModuleInterop',
  '--moduleResolution', 'bundler', '--module', 'ESNext', '--target', 'ES2022', '/work/entry.tsx', '/work/submission.tsx',
], {stdio: 'inherit', cwd: work, timeout: 180000});
const serveUrl = await bundle({entryPoint: '/work/entry.tsx', outDir: '/work/bundle', publicDir: null});
const browserExecutable = '/usr/bin/chromium';
const chromiumOptions = {gl: 'swangle'};
const composition = await selectComposition({serveUrl, id: 'Trailer', browserExecutable, chromiumOptions});
if (composition.width !== 1920 || composition.height !== 1080 || composition.fps !== 30 || composition.durationInFrames !== 390) throw new Error('Composition changed the fixed format.');
const common = {serveUrl, composition, browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000};
await renderMedia({...common, outputLocation: '/out/video.mp4', codec: 'h264', crf: 18, muted: true, concurrency: Number(process.env.CONCURRENCY || 3)});
await renderStill({...common, output: '/out/poster.jpg', frame: 360, imageFormat: 'jpeg'});
