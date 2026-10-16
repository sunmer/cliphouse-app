import {execFile} from 'node:child_process';
import {mkdtemp, rename, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {makeCancelSignal, openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {engineOf} from '../src/videos/engine.ts';
import {snapshotFrame, snapshotFrames, writeHyperframesProject} from './hyperframes.ts';
import {readFile} from 'node:fs/promises';
import {HttpError, fingerprint, validateShare, type Snapshot} from './model.ts';
import {PREVIEW_WIDTH} from './render.ts';
import type {createStore} from './store.ts';

export type PreviewImage = {image: string; cleanup: () => Promise<void>};
export type RenderPreview = (value: Snapshot, signal: AbortSignal) => Promise<PreviewImage>;

const run = promisify(execFile);
// Preview loop: a few seconds around the poster frame, silent, small enough for a chat grid.
export const LOOP_SECONDS = 4;
export const LOOP_FPS = 15;
export const MAX_LOOP_BYTES = 1_500_000;
// Landscape and square loops are 480 px wide; portrait loops are 640 px tall.
const LOOP_SCALE = `scale=w='if(gte(iw,ih),480,-2)':h='if(gte(iw,ih),-2,640)':flags=lanczos`;

// The loop window in source frames: LOOP_SECONDS that end shortly after the poster frame, inside the video.
export function loopWindow(meta: {fps: number; durationInFrames: number; posterFrame: number}) {
  const length = Math.min(LOOP_SECONDS * meta.fps, meta.durationInFrames);
  const start = Math.max(0, Math.min(meta.durationInFrames - length, meta.posterFrame - Math.round(length * 0.6)));
  return {start, length};
}

async function encodeLoop(args: string[], output: string, signal: AbortSignal) {
  // The image's Debian ffmpeg has libwebp; LOOP_FFMPEG points local runs at another build.
  await run(process.env.LOOP_FFMPEG || 'ffmpeg', ['-v', 'error', '-y', ...args, '-vf', LOOP_SCALE, '-an', '-c:v', 'libwebp_anim',
    '-quality', '70', '-compression_level', '4', '-loop', '0', output], {signal});
}

const aborted = (signal: AbortSignal) => {
  if (signal.aborted) throw Object.assign(new Error('Preview render aborted.'), {name: 'AbortError'});
};

// Personalized poster renderer. Separate from share/export renders: it keeps one Chrome open for the
// life of the instance, so a Remotion still costs a page load and one frame instead of a browser launch.
export function createPreviewRenderer() {
  type Browser = Awaited<ReturnType<typeof openBrowser>>;
  let browser: Promise<Browser> | null = null;
  const serveUrl = path.resolve(process.env.REMOTION_BUNDLE || 'render-bundle');
  const getBrowser = () => browser ??= openBrowser('chrome', {
    browserExecutable: process.env.REMOTION_BROWSER || undefined,
    chromiumOptions: {gl: 'angle'},
  }).catch((e) => { browser = null; throw e; });
  const reset = async () => {
    const old = browser;
    browser = null;
    await old?.then((b) => b.close({silent: true})).catch(() => {});
  };

  // Runs one Remotion job on the shared browser. Any failure relaunches the browser: it may have crashed
  // or been frozen by CPU throttling between requests.
  async function withBrowser(signal: AbortSignal, job: (puppeteerInstance: Browser, cancelSignal: ReturnType<typeof makeCancelSignal>['cancelSignal']) => Promise<void>) {
    const {cancelSignal, cancel} = makeCancelSignal();
    const onAbort = () => cancel();
    signal.addEventListener('abort', onAbort, {once: true});
    try {
      const puppeteerInstance = await getBrowser();
      aborted(signal);
      await job(puppeteerInstance, cancelSignal);
    } catch (e) {
      await reset();
      throw e;
    } finally { signal.removeEventListener('abort', onAbort); }
  }

  const remotion = (value: Snapshot, image: string, signal: AbortSignal) => withBrowser(signal, async (puppeteerInstance, cancelSignal) => {
    const composition = await selectComposition({serveUrl, id: value.composition, inputProps: value.props, puppeteerInstance, timeoutInMilliseconds: 20_000});
    aborted(signal);
    await renderStill({serveUrl, composition, inputProps: value.props, puppeteerInstance, cancelSignal, timeoutInMilliseconds: 20_000,
      frame: Math.min(value.meta.posterFrame, composition.durationInFrames - 1), scale: PREVIEW_WIDTH / composition.width,
      imageFormat: 'jpeg', jpegQuality: 82, output: image});
  });

  // A small silent H.264 clip of the loop window at LOOP_FPS, for encodeLoop.
  const remotionClip = (value: Snapshot, output: string, signal: AbortSignal) => withBrowser(signal, async (puppeteerInstance, cancelSignal) => {
    const composition = await selectComposition({serveUrl, id: value.composition, inputProps: value.props, puppeteerInstance, timeoutInMilliseconds: 20_000});
    aborted(signal);
    const {start, length} = loopWindow({...value.meta, durationInFrames: composition.durationInFrames});
    await renderMedia({serveUrl, composition, inputProps: value.props, puppeteerInstance, cancelSignal, timeoutInMilliseconds: 30_000,
      codec: 'h264', crf: 20, pixelFormat: 'yuv420p', muted: true, outputLocation: output, concurrency: 2,
      frameRange: [start, start + length - 1], everyNthFrame: Math.max(1, Math.round(composition.fps / LOOP_FPS)),
      scale: composition.width >= composition.height ? 480 / composition.width : 640 / composition.height});
  });

  const render: RenderPreview = async (value, signal) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-preview-'));
    const image = path.join(directory, 'poster.jpg');
    const cleanup = () => rm(directory, {recursive: true, force: true});
    try {
      if (engineOf(value.template) === 'hyperframes') {
        await writeHyperframesProject(value, directory);
        await snapshotFrame(directory, image, value.meta.posterFrame / value.meta.fps, PREVIEW_WIDTH, signal);
      } else await remotion(value, image, signal);
      if ((await stat(image)).size > 1_000_000) throw new Error('Rendered preview exceeds size limit.');
      return {image, cleanup};
    } catch (e) {
      await cleanup();
      throw e;
    }
  };

  // Animated WebP loop of the filled template. HyperFrames captures exact instants in one browser session,
  // which is faster than rendering the whole video; Remotion renders only the loop window.
  const renderLoop: RenderPreview = async (value, signal) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'cliphouse-loop-'));
    const image = path.join(directory, 'loop.webp');
    const cleanup = () => rm(directory, {recursive: true, force: true});
    try {
      if (engineOf(value.template) === 'hyperframes') {
        const {start, length} = loopWindow(value.meta);
        const count = Math.max(1, Math.round((length / value.meta.fps) * LOOP_FPS));
        const times = Array.from({length: count}, (_, i) => start / value.meta.fps + i / LOOP_FPS);
        await writeHyperframesProject(value, directory);
        const frames = await snapshotFrames(directory, times, signal);
        await Promise.all(frames.map((frame, i) => rename(frame, path.join(directory, `seq-${String(i).padStart(3, '0')}.png`))));
        await encodeLoop(['-framerate', String(LOOP_FPS), '-i', path.join(directory, 'seq-%03d.png')], image, signal);
      } else {
        const clip = path.join(directory, 'clip.mp4');
        await remotionClip(value, clip, signal);
        await encodeLoop(['-i', clip], image, signal);
      }
      if ((await stat(image)).size > MAX_LOOP_BYTES) throw new Error('Rendered loop exceeds size limit.');
      return {image, cleanup};
    } catch (e) {
      await cleanup();
      throw e;
    }
  };

  // Launch the browser and load the bundle once at startup, so the first user preview is warm.
  const warm = async () => {
    const variant = manifest.variants.find((v) => !('hidden' in v && v.hidden) && engineOf(v.template) === 'remotion');
    if (!variant) return;
    const started = Date.now();
    const result = await render(validateShare({variantId: variant.id, props: variant.props}), AbortSignal.timeout(60_000));
    await result.cleanup();
    console.log(`Preview renderer warm in ${Date.now() - started} ms`);
  };
  return {render, renderLoop, warm, close: reset};
}

export type PreviewResult = {
  poster: string | null; video: string | null; editor: string; previewId: string; cached: boolean; ms: number;
  image?: Buffer; message?: string;
};
export type LoopResult = {video: string | null; previewId: string; cached: boolean; ms: number; message?: string};
type Store = Pick<ReturnType<typeof createStore>, 'previewExists' | 'savePreview' | 'reservePreview' | 'previewAsset'>;
type AssetArgs = {variantId: string; props: unknown; templateVersion?: number; caller: string; keyed: boolean; timeoutMs?: number};
export type PreviewExt = 'jpg' | 'webp';

// Orchestrates one personalized asset (poster or loop): cache lookup, a per-instance queue that shares and
// exports never hold, the daily preview quota (cache misses only), and a hard time budget. Every failure
// degrades to url: null with a message, so the agent flow always completes.
function createAssetService({store, render, origin, version, ext, budgetMs, maxQueue, concurrency, readBack}: {
  store: Store; render: RenderPreview; origin: string; version: string; ext: PreviewExt;
  budgetMs: number; maxQueue: number; concurrency: number; readBack: boolean;
}) {
  let queued = 0;
  let running = 0;
  const waiting: (() => void)[] = [];
  const inflight = new Map<string, Promise<Buffer | undefined>>();
  // Runs up to `concurrency` renders at once on this instance; pages share the one open browser.
  // The caller's signal covers time spent waiting in line.
  const enqueue = async <T>(job: () => Promise<T>, signal: AbortSignal) => {
    if (queued >= maxQueue) throw new HttpError(429, 'The preview renderer is busy.');
    queued++;
    try {
      if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
      running++;
      try {
        if (signal.aborted) throw new HttpError(504, 'Preview timed out.');
        return await job();
      } finally { running--; waiting.shift()?.(); }
    } finally { queued--; }
  };
  const produce = async (hash: string, value: Snapshot, signal: AbortSignal) => {
    const result = await render(value, signal);
    try {
      const image = readBack ? await readFile(result.image) : undefined;
      await store.savePreview(hash, result.image, ext);
      return image;
    } finally { await result.cleanup().catch(() => {}); }
  };
  return async ({variantId, props, templateVersion, caller, keyed, timeoutMs}: AssetArgs) => {
    const started = Date.now();
    // Validation errors propagate: the tool reports them so the agent can fix the props.
    const value = validateShare({variantId, props, ...(templateVersion === undefined ? {} : {templateVersion})});
    // Posters and loops of one edit share the hash; the extension tells them apart.
    const hash = fingerprint('', value, `${version}-preview`);
    const url = `${origin}/p/${hash}.${ext}`;
    const done = (partial: {url?: string; image?: Buffer; message?: string; cached: boolean}) =>
      ({url: null as string | null, previewId: hash, ...partial, ms: Date.now() - started});
    const signal = AbortSignal.timeout(Math.min(timeoutMs ?? budgetMs, budgetMs));
    try {
      if (await store.previewExists(hash, ext).catch(() => false)) {
        if (!readBack) return done({url, cached: true});
        const asset = await store.previewAsset(hash, ext).catch(() => null);
        const image = asset && asset.size < 1_000_000 ? await streamToBuffer(asset.stream()).catch(() => undefined) : undefined;
        return done({url, cached: true, image});
      }
      let job = inflight.get(hash);
      if (!job) {
        try { await store.reservePreview(caller, keyed); }
        catch (e) {
          if (e instanceof HttpError && e.status === 429) return done({cached: false, message: e.message});
          // A quota store outage does not block previews; the per-instance queue still bounds the work.
          console.error('Preview quota check failed:', (e as {code?: string}).code || (e as Error).name);
        }
        job = enqueue(() => produce(hash, value, signal), signal);
        inflight.set(hash, job);
        job.catch(() => {}).finally(() => inflight.delete(hash));
      }
      const image = await Promise.race([job, new Promise<never>((_, reject) => {
        if (signal.aborted) reject(new HttpError(504, 'Preview timed out.'));
        signal.addEventListener('abort', () => reject(new HttpError(504, 'Preview timed out.')), {once: true});
      })]);
      return done({url, cached: false, image});
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(`Preview ${ext} render failed:`, (e as {code?: string}).code || (e as Error).name, String((e as Error).message).slice(0, 200));
      const message = e instanceof HttpError && e.status === 504 ? 'The preview took too long.' : 'The preview could not be rendered.';
      return done({cached: false, message});
    }
  };
}

// Personalized poster (JPEG). Returns the image bytes too, so MCP hosts can show it inline.
export function createPreviewService({store, render, origin, version, budgetMs = 25_000, maxQueue = 12, concurrency = 3}: {
  store: Store; render: RenderPreview; origin: string; version: string; budgetMs?: number; maxQueue?: number; concurrency?: number;
}) {
  const poster = createAssetService({store, render, origin, version, ext: 'jpg', budgetMs, maxQueue, concurrency, readBack: true});
  return async ({editor, ...args}: AssetArgs & {editor: string}): Promise<PreviewResult> => {
    const {url, image, message, ...rest} = await poster(args);
    return {...rest, poster: url, video: null, editor, image,
      ...(message ? {message: `${message} Open the editor link to see the video.`} : {})};
  };
}

// Personalized animated WebP loop. Slower than a poster, so it has its own queue: loops never delay posters.
export function createLoopService({store, render, origin, version, budgetMs = 45_000, maxQueue = 8, concurrency = 2}: {
  store: Store; render: RenderPreview; origin: string; version: string; budgetMs?: number; maxQueue?: number; concurrency?: number;
}) {
  const loop = createAssetService({store, render, origin, version, ext: 'webp', budgetMs, maxQueue, concurrency, readBack: false});
  return async (args: AssetArgs): Promise<LoopResult> => {
    const {url, image: _image, ...rest} = await loop(args);
    return {...rest, video: url};
  };
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}
