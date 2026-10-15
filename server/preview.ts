import {mkdtemp, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {makeCancelSignal, openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {engineOf} from '../src/videos/engine.ts';
import {snapshotFrame, writeHyperframesProject} from './hyperframes.ts';
import {readFile} from 'node:fs/promises';
import {HttpError, fingerprint, validateShare, type Snapshot} from './model.ts';
import {PREVIEW_WIDTH} from './render.ts';
import type {createStore} from './store.ts';

export type PreviewImage = {image: string; cleanup: () => Promise<void>};
export type RenderPreview = (value: Snapshot, signal: AbortSignal) => Promise<PreviewImage>;

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

  async function remotion(value: Snapshot, image: string, signal: AbortSignal) {
    const {cancelSignal, cancel} = makeCancelSignal();
    const onAbort = () => cancel();
    signal.addEventListener('abort', onAbort, {once: true});
    try {
      const puppeteerInstance = await getBrowser();
      aborted(signal);
      const composition = await selectComposition({serveUrl, id: value.composition, inputProps: value.props, puppeteerInstance, timeoutInMilliseconds: 20_000});
      aborted(signal);
      await renderStill({serveUrl, composition, inputProps: value.props, puppeteerInstance, cancelSignal, timeoutInMilliseconds: 20_000,
        frame: Math.min(value.meta.posterFrame, composition.durationInFrames - 1), scale: PREVIEW_WIDTH / composition.width,
        imageFormat: 'jpeg', jpegQuality: 82, output: image});
    } catch (e) {
      // Relaunch after any failure: the browser may have crashed or been frozen by CPU throttling between requests.
      await reset();
      throw e;
    } finally { signal.removeEventListener('abort', onAbort); }
  }

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

  // Launch the browser and load the bundle once at startup, so the first user preview is warm.
  const warm = async () => {
    const variant = manifest.variants.find((v) => !('hidden' in v && v.hidden) && engineOf(v.template) === 'remotion');
    if (!variant) return;
    const started = Date.now();
    const result = await render(validateShare({variantId: variant.id, props: variant.props}), AbortSignal.timeout(60_000));
    await result.cleanup();
    console.log(`Preview renderer warm in ${Date.now() - started} ms`);
  };
  return {render, warm, close: reset};
}

export type PreviewResult = {
  poster: string | null; video: null; editor: string; previewId: string; cached: boolean; ms: number;
  image?: Buffer; message?: string;
};
type Store = Pick<ReturnType<typeof createStore>, 'previewExists' | 'savePreview' | 'reservePreview' | 'previewAsset'>;

// Orchestrates one personalized poster: cache lookup, a per-instance queue that shares and exports never
// hold, the daily preview quota (cache misses only), and a hard time budget. Every failure degrades to
// poster: null with the editor link, so the agent flow always completes.
export function createPreviewService({store, render, origin, version, budgetMs = 25_000, maxQueue = 6}: {
  store: Store; render: RenderPreview; origin: string; version: string; budgetMs?: number; maxQueue?: number;
}) {
  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  const inflight = new Map<string, Promise<Buffer>>();
  // Runs jobs one at a time on this instance. The caller's signal covers time spent waiting in line.
  const enqueue = <T>(job: () => Promise<T>, signal: AbortSignal) => {
    if (queued >= maxQueue) throw new HttpError(429, 'The preview renderer is busy.');
    queued++;
    const run = tail.then(() => { if (signal.aborted) throw new HttpError(504, 'Preview timed out.'); return job(); });
    tail = run.catch(() => {}).finally(() => { queued--; });
    return run;
  };
  const produce = async (hash: string, value: Snapshot, signal: AbortSignal) => {
    const result = await render(value, signal);
    try {
      const image = await readFile(result.image);
      await store.savePreview(hash, result.image);
      return image;
    } finally { await result.cleanup().catch(() => {}); }
  };
  return async ({variantId, props, templateVersion, caller, keyed, editor}: {
    variantId: string; props: unknown; templateVersion?: number; caller: string; keyed: boolean; editor: string;
  }): Promise<PreviewResult> => {
    const started = Date.now();
    // Validation errors propagate: the tool reports them so the agent can fix the props.
    const value = validateShare({variantId, props, ...(templateVersion === undefined ? {} : {templateVersion})});
    const hash = fingerprint('', value, `${version}-preview`);
    const base = {video: null, editor, previewId: hash};
    const url = `${origin}/p/${hash}.jpg`;
    const done = (partial: Partial<PreviewResult> & {cached: boolean}) => ({...base, poster: null, ...partial, ms: Date.now() - started});
    const signal = AbortSignal.timeout(budgetMs);
    try {
      if (await store.previewExists(hash).catch(() => false)) {
        const asset = await store.previewAsset(hash).catch(() => null);
        const image = asset && asset.size < 1_000_000 ? await streamToBuffer(asset.stream()).catch(() => undefined) : undefined;
        return done({poster: url, cached: true, image});
      }
      let job = inflight.get(hash);
      if (!job) {
        try { await store.reservePreview(caller, keyed); }
        catch (e) {
          if (e instanceof HttpError && e.status === 429) return done({cached: false, message: `${e.message} Open the editor link to see the video.`});
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
      return done({poster: url, cached: false, image});
    } catch (e) {
      if (!(e instanceof HttpError)) console.error('Preview render failed:', (e as {code?: string}).code || (e as Error).name, String((e as Error).message).slice(0, 200));
      const message = e instanceof HttpError && e.status === 504 ? 'The preview took too long.' : 'The preview could not be rendered.';
      return done({cached: false, message: `${message} Open the editor link to see the video.`});
    }
  };
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}
