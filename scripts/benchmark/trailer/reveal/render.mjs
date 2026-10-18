// Runs inside cliphouse-benchmark:1. /input holds the composition, tiles.json, and public/ (videos and music).
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';

const work = '/work';
for (const name of ['entry.tsx', 'Reveal.tsx', 'tiles.json']) fs.copyFileSync(path.join('/input', name), path.join(work, name));
fs.copyFileSync('/opt/benchmark/font.css', path.join(work, 'font.css'));
fs.copyFileSync('/opt/benchmark/node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2', path.join(work, 'archivo.woff2'));
fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({type: 'module'}));
const serveUrl = await bundle({entryPoint: '/work/entry.tsx', outDir: '/work/bundle', publicDir: '/input/public'});
const browserExecutable = '/usr/bin/chromium';
const composition = await selectComposition({serveUrl, id: 'Reveal', browserExecutable});
await renderMedia({serveUrl, composition, browserExecutable, outputLocation: '/out/reveal.mp4', codec: 'h264', crf: 18, audioCodec: 'aac', audioBitrate: '256k', concurrency: 1, offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024, offthreadVideoThreads: 1, timeoutInMilliseconds: 120000});
await renderStill({serveUrl, composition, browserExecutable, output: '/out/reveal-poster.jpg', frame: 300, imageFormat: 'jpeg'});
await renderStill({serveUrl, composition, browserExecutable, output: '/out/reveal-end.jpg', frame: 470, imageFormat: 'jpeg'});
