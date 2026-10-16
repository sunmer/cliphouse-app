import {execFile} from 'node:child_process';
import {copyFile, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {bindHyperframes, hyperframesVariables} from '../src/videos/hyperframes.ts';
import {logoOf} from '../src/videos/logo.ts';
import type {Snapshot} from './model.ts';

const run = promisify(execFile);
const root = process.cwd();
const assets = ['gsap.min.js', 'fonts/archivo.woff2', 'fonts/fraunces.woff2', 'fonts/fraunces-italic.woff2', 'fonts/inter.woff2', 'fonts/jetbrains-mono.woff2'];

// Reads a stored logo PNG by id. Set once at startup by the share service and the loop worker.
export type LogoReader = (id: string) => Promise<Buffer>;
let readLogo: LogoReader | null = null;
export const setLogoReader = (reader: LogoReader | null) => { readLogo = reader; };

export async function writeHyperframesProject(value: Snapshot, directory: string) {
  const [template, css, js, music, beat] = await Promise.all([
    readFile(path.join(root, 'src/hyperframes', value.template, 'index.html'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/base.css'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/base.js'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/music.js'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/beat.js'), 'utf8'),
  ]);
  const html = template.replace('__BASE_CSS__', css).replace('__BASE_JS__', js).replace('__MUSIC_JS__', () => music).replace('__BEAT_JS__', () => beat);
  await mkdir(path.join(directory, 'assets/fonts'), {recursive: true});
  await Promise.all(assets.map((asset) => copyFile(path.join(root, 'public/hyperframes/assets', asset), path.join(directory, 'assets', asset))));
  // The logo is copied into the project, so renders read it from disk and never from the network.
  const logo = logoOf(value.props);
  if (logo) {
    if (!readLogo) throw new Error('Logos are not available on this renderer.');
    await writeFile(path.join(directory, 'assets', `logo-${logo.id}.png`), await readLogo(logo.id));
  }
  await writeFile(path.join(directory, 'index.html'), bindHyperframes({html, meta: value.meta, props: value.props, assetBase: 'assets',
    logoSrc: (id) => `assets/logo-${id}.png`}));
  await writeFile(path.join(directory, 'variables.json'), JSON.stringify(hyperframesVariables(value.props, value.meta)));
}

export async function renderHyperframes(project: string, output: string, signal: AbortSignal) {
  await run(path.join(root, 'node_modules/.bin/hyperframes'), [
    'render', project, '--variables-file', path.join(project, 'variables.json'), '--strict-variables',
    '--fps', '30', '--quality', 'high', '--workers', process.env.RENDER_CONCURRENCY || '2', '--strict', '--no-best-effort', '--quiet', '-o', output,
  ], {signal, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1', HYPERFRAMES_RENDER_DETACHED: '0'}, maxBuffer: 1024 * 1024 * 8});
}

export async function stillFromVideo(video: string, output: string, seconds: number, width: number, signal: AbortSignal) {
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(seconds), '-i', video, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '4', output], {signal});
}

// One frame without rendering the whole video: `hyperframes snapshot` seeks the composition to an exact time.
export async function snapshotFrame(project: string, output: string, seconds: number, width: number, signal: AbortSignal) {
  const dir = path.join(project, 'snap');
  await run(path.join(root, 'node_modules/.bin/hyperframes'), [
    'snapshot', project, '--at', seconds.toFixed(3), '--no-end', '--describe', 'false', '-o', dir,
  ], {signal, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}, maxBuffer: 1024 * 1024 * 8});
  const frame = (await readdir(dir)).find((f) => f.startsWith('frame-') && f.endsWith('.png'));
  if (!frame) throw new Error('HyperFrames snapshot wrote no frame.');
  await run('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, frame), '-vf', `scale=${width}:-2`, '-q:v', '4', output], {signal});
}

// Several exact instants in one browser session, for a short preview loop. Returns the PNGs in time order.
export async function snapshotFrames(project: string, seconds: number[], signal: AbortSignal) {
  const dir = path.join(project, 'loop');
  await run(path.join(root, 'node_modules/.bin/hyperframes'), [
    'snapshot', project, '--at', seconds.map((s) => s.toFixed(3)).join(','), '--no-end', '--describe', 'false', '-o', dir,
  ], {signal, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}, maxBuffer: 1024 * 1024 * 8});
  // Names are frame-<index>-at-<time>s.png; the index orders them.
  const frames = (await readdir(dir)).filter((f) => /^frame-\d+-.*\.png$/.test(f))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  if (frames.length !== seconds.length) throw new Error(`HyperFrames snapshot wrote ${frames.length} of ${seconds.length} frames.`);
  return frames.map((f) => path.join(dir, f));
}
