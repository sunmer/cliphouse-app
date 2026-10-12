import {mkdtemp, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {makeCancelSignal, openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {engineOf} from '../src/videos/engine.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {scoreOf as beatScoreOf} from '../src/videos/beat/schema.ts';
import {addScore} from './audio.ts';
import {renderHyperframes, stillFromVideo, writeHyperframesProject} from './hyperframes.ts';
import type {Snapshot} from './model.ts';

export const MAX_VIDEO_BYTES = 60_000_000;

// Music templates render silent video in either engine, then mux the generated score when sound is on.
async function withScore(value: Snapshot, video: string, signal?: AbortSignal) {
  const score = beatScoreOf(value.meta) ?? scoreOf(value.meta);
  if (score && (value.props as {audio?: {enabled: boolean}}).audio?.enabled) await addScore(video, score, value.props, signal);
}

async function renderHyperframesThumbnail(value: Snapshot) {
  const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-share-'));
  const image = path.join(directory, 'preview.jpg');
  const video = path.join(directory, 'thumbnail.mp4');
  const cleanup = () => rm(directory, {recursive: true, force: true});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 250_000);
  try {
    await writeHyperframesProject(value, directory);
    await renderHyperframes(directory, video, controller.signal);
    await stillFromVideo(video, image, value.meta.posterFrame / value.meta.fps, 900, controller.signal);
    if ((await stat(image)).size > 1_000_000) throw new Error('Rendered thumbnail exceeds preview size limit.');
    return {image, cleanup};
  } catch (e) {
    await cleanup();
    throw e;
  } finally { clearTimeout(timer); }
}

async function renderHyperframesVideo(value: Snapshot) {
  const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-export-'));
  const video = path.join(directory, 'video.mp4');
  const cleanup = () => rm(directory, {recursive: true, force: true});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 270_000);
  try {
    await writeHyperframesProject(value, directory);
    await renderHyperframes(directory, video, controller.signal);
    await withScore(value, video, controller.signal);
    if ((await stat(video)).size > MAX_VIDEO_BYTES) throw new Error('Rendered video exceeds export size limit.');
    return {video, cleanup};
  } catch (e) {
    await cleanup();
    throw e;
  } finally { clearTimeout(timer); }
}

export async function renderThumbnail(value: Snapshot) {
  if (engineOf(value.template) === 'hyperframes') return renderHyperframesThumbnail(value);
  const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-share-'));
  const image = path.join(directory, 'preview.jpg');
  const cleanup = () => rm(directory, {recursive: true, force: true});
  const browser = await openBrowser('chrome', {
    browserExecutable: process.env.REMOTION_BROWSER || undefined,
    chromiumOptions: {gl: 'angle'},
  }).catch(async (e) => { await cleanup(); throw e; });
  const {cancelSignal, cancel} = makeCancelSignal();
  const timer = setTimeout(cancel, 250_000);
  try {
    const serveUrl = path.resolve(process.env.REMOTION_BUNDLE || 'render-bundle');
    const composition = await selectComposition({serveUrl, id: value.composition, inputProps: value.props, puppeteerInstance: browser});
    const common = {serveUrl, composition, inputProps: value.props, puppeteerInstance: browser, cancelSignal, timeoutInMilliseconds: 30_000};
    await renderStill({...common, frame: Math.min(value.meta.posterFrame, composition.durationInFrames - 1), scale: 900 / composition.width, imageFormat: 'jpeg', jpegQuality: 85, output: image});
    if ((await stat(image)).size > 1_000_000) throw new Error('Rendered thumbnail exceeds preview size limit.');
    return {image, cleanup};
  } catch (e) {
    await cleanup();
    throw e;
  } finally {
    clearTimeout(timer);
    await browser.close({silent: true});
  }
}

// Full-resolution H.264 export of one validated catalog edit. Music templates add their AAC score.
export async function renderVideo(value: Snapshot) {
  if (engineOf(value.template) === 'hyperframes') return renderHyperframesVideo(value);
  const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-export-'));
  const video = path.join(directory, 'video.mp4');
  const cleanup = () => rm(directory, {recursive: true, force: true});
  const browser = await openBrowser('chrome', {
    browserExecutable: process.env.REMOTION_BROWSER || undefined,
    chromiumOptions: {gl: 'angle'},
  }).catch(async (e) => { await cleanup(); throw e; });
  const {cancelSignal, cancel} = makeCancelSignal();
  const timer = setTimeout(cancel, 270_000);
  try {
    const serveUrl = path.resolve(process.env.REMOTION_BUNDLE || 'render-bundle');
    const composition = await selectComposition({serveUrl, id: value.composition, inputProps: value.props, puppeteerInstance: browser});
    await renderMedia({
      serveUrl, composition, inputProps: value.props, puppeteerInstance: browser, cancelSignal,
      codec: 'h264', crf: 18, pixelFormat: 'yuv420p', muted: true, outputLocation: video,
      concurrency: Number(process.env.RENDER_CONCURRENCY || 2), timeoutInMilliseconds: 60_000,
    });
    await withScore(value, video);
    if ((await stat(video)).size > MAX_VIDEO_BYTES) throw new Error('Rendered video exceeds export size limit.');
    return {video, cleanup};
  } catch (e) {
    await cleanup();
    throw e;
  } finally {
    clearTimeout(timer);
    await browser.close({silent: true});
  }
}
