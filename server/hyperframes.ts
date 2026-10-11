import {execFile} from 'node:child_process';
import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {bindHyperframes, hyperframesVariables} from '../src/videos/hyperframes.ts';
import type {Snapshot} from './model.ts';

const run = promisify(execFile);
const root = process.cwd();
const assets = ['gsap.min.js', 'fonts/archivo.woff2', 'fonts/fraunces.woff2', 'fonts/fraunces-italic.woff2', 'fonts/inter.woff2', 'fonts/jetbrains-mono.woff2'];

export async function writeHyperframesProject(value: Snapshot, directory: string) {
  const [template, css, js] = await Promise.all([
    readFile(path.join(root, 'src/hyperframes', value.template, 'index.html'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/base.css'), 'utf8'),
    readFile(path.join(root, 'src/hyperframes/shared/base.js'), 'utf8'),
  ]);
  const html = template.replace('__BASE_CSS__', css).replace('__BASE_JS__', js);
  await mkdir(path.join(directory, 'assets/fonts'), {recursive: true});
  await Promise.all(assets.map((asset) => copyFile(path.join(root, 'public/hyperframes/assets', asset), path.join(directory, 'assets', asset))));
  await writeFile(path.join(directory, 'index.html'), bindHyperframes({html, meta: value.meta, props: value.props, assetBase: 'assets'}));
  await writeFile(path.join(directory, 'variables.json'), JSON.stringify(hyperframesVariables(value.props)));
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
