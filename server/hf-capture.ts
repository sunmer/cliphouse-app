// Persistent HyperFrames loop capture. `hyperframes snapshot` launches Chrome, loads and settles the
// page, then seeks and screenshots each frame at full size, once per loop. This keeps one Chrome open
// for the life of the process and captures straight at loop size, using HyperFrames' own bundler,
// Chrome arguments, readiness check and seek, so frames match what `hyperframes snapshot` captures.
//
// It imports HyperFrames internals by file name, so it is tied to the pinned HyperFrames version.
// The loop renderer falls back to the CLI when this module cannot load or a capture fails.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// The only HyperFrames version these internal module names are known to match.
export const HF_CAPTURE_VERSION = '0.8.146';
const dist = path.join(process.cwd(), 'node_modules/hyperframes/dist');
const FILES = {
  page: 'chunk-HTM4CIFS.js', server: 'chunk-EGO6Z24R.js', bundle: 'bundleWithLocalizedFonts-EEIRL7FT.js',
  args: 'chunk-WU2B74TL.js', viewport: 'chunk-FH7WODJH.js', browser: 'manager-BPSR6D3V.js',
};
type Page = {
  setViewport(v: {width: number; height: number}): Promise<void>;
  goto(url: string, o: {waitUntil: string; timeout: number}): Promise<unknown>;
  screenshot(o: Record<string, unknown>): Promise<Uint8Array>;
  close(): Promise<void>;
  evaluateOnNewDocument(script: string): Promise<unknown>;
};
type Browser = {newPage(): Promise<Page>; close(): Promise<void>; connected: boolean};
type Internals = {
  bundle: (dir: string) => Promise<string>;
  serve: (dir: string, html: string) => Promise<{url: string; close: () => Promise<void> | void}>;
  viewport: (html: string) => {width: number; height: number};
  chromeArgs: (o: {width: number; height: number}) => string[];
  executablePath: () => Promise<string>;
  settle: (page: Page) => Promise<boolean>;
  seek: (page: Page, seconds: number) => Promise<void>;
  guard: (page: Page) => Promise<void>;
};

let internals: Promise<Internals> | null = null;
async function load(): Promise<Internals> {
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), 'node_modules/hyperframes/package.json'), 'utf8'));
  if (pkg.version !== HF_CAPTURE_VERSION) throw new Error(`hf-capture is pinned to hyperframes ${HF_CAPTURE_VERSION}, found ${pkg.version}.`);
  const mod = (file: string) => import(path.join(dist, file));
  const [page, server, bundle, args, viewport, browser] = await Promise.all(
    [FILES.page, FILES.server, FILES.bundle, FILES.args, FILES.viewport, FILES.browser].map(mod));
  for (const [name, fn] of Object.entries({openSettledCompositionPage: page.openSettledCompositionPage, seekCompositionTimeline: page.seekCompositionTimeline,
    waitForRuntimeReady: page.waitForRuntimeReady, installPageFunctionGuard: page.installPageFunctionGuard, serveStaticProjectHtml: server.serveStaticProjectHtml,
    bundleWithLocalizedFonts: bundle.bundleWithLocalizedFonts, buildChromeArgs: args.buildChromeArgs,
    resolveCompositionViewportFromHtml: viewport.resolveCompositionViewportFromHtml, ensureBrowser: browser.ensureBrowser})) {
    if (typeof fn !== 'function') throw new Error(`hf-capture: hyperframes export ${name} is missing.`);
  }
  return {
    bundle: (dir) => bundle.bundleWithLocalizedFonts(dir),
    serve: (dir, html) => server.serveStaticProjectHtml(dir, html, undefined, [], undefined),
    viewport: (html) => viewport.resolveCompositionViewportFromHtml(html),
    // Software GPU, as `hyperframes snapshot` resolves it on Cloud Run (no WebGL device).
    chromeArgs: ({width, height}) => args.buildChromeArgs({width, height, captureMode: 'screenshot', requiresWebGpu: false}, {browserGpuMode: 'software'}),
    executablePath: async () => (await browser.ensureBrowser()).executablePath,
    // The same readiness check as `hyperframes snapshot`, without its fixed 1.5 s settle: frames are
    // captured at exact seek times, and the seek itself waits for fonts and two animation frames.
    settle: (p) => page.waitForRuntimeReady(p, 5_000),
    seek: (p, s) => page.seekCompositionTimeline(p, s, {exactTime: true}),
    guard: (p) => page.installPageFunctionGuard(p),
  };
}

// One page per browser: headless Chrome does not run animation frames in a background tab, and the
// HyperFrames seek waits for them. So concurrent captures each take their own browser from a pool,
// and the pool keeps up to `poolSize` of them open between loops.
export function createHyperframesCapture(poolSize = Number(process.env.HF_BROWSER_POOL || 3)) {
  type Entry = {browser: Browser; key: string};
  const idle: Entry[] = [];
  const acquire = async (hf: Internals, viewport: {width: number; height: number}): Promise<Entry> => {
    const key = `${viewport.width}x${viewport.height}`;
    for (let i = idle.length - 1; i >= 0; i--) {
      const entry = idle[i];
      if (entry.key !== key) continue;
      idle.splice(i, 1);
      if (entry.browser.connected) return entry;
    }
    const puppeteer = createRequire(path.join(dist, FILES.page))('puppeteer-core');
    const browser = await puppeteer.launch({headless: true, executablePath: await hf.executablePath(), args: hf.chromeArgs(viewport)}) as Browser;
    return {browser, key};
  };
  const release = async (entry: Entry, healthy: boolean) => {
    if (healthy && entry.browser.connected && idle.length < poolSize) { idle.push(entry); return; }
    await entry.browser.close().catch(() => {});
  };

  // Captures the given instants of the project in `dir` as JPEG frames `width` px wide.
  async function capture(dir: string, seconds: number[], width: number, signal: AbortSignal) {
    const hf = await (internals ??= load().catch((e) => { internals = null; throw e; }));
    const html = await hf.bundle(dir);
    const viewport = hf.viewport(html);
    const server = await hf.serve(dir, html);
    let entry: Entry | null = null;
    let page: Page | null = null;
    let healthy = false;
    try {
      entry = await acquire(hf, viewport);
      page = await entry.browser.newPage();
      await hf.guard(page);
      await page.setViewport(viewport);
      await page.goto(server.url, {waitUntil: 'domcontentloaded', timeout: 30_000});
      if (!await hf.settle(page)) throw new Error('HyperFrames runtime did not become ready.');
      const scale = width / viewport.width;
      const frames: Uint8Array[] = [];
      for (const s of seconds) {
        if (signal.aborted) throw new Error('Loop capture aborted.');
        await hf.seek(page, s);
        frames.push(await page.screenshot({type: 'jpeg', quality: 92,
          clip: {x: 0, y: 0, width: viewport.width, height: viewport.height, scale}}));
      }
      healthy = true;
      return frames;
    } finally {
      await page?.close().catch(() => {});
      if (entry) await release(entry, healthy);
      await server.close();
    }
  }
  // Launch the pool's browsers ahead of the first loop, so a warm instance never pays a Chrome launch.
  const warm = async (viewport = {width: 1920, height: 1080}) => {
    const hf = await (internals ??= load().catch((e) => { internals = null; throw e; }));
    const entries = await Promise.all(Array.from({length: Math.max(0, poolSize - idle.length)}, () => acquire(hf, viewport)));
    await Promise.all(entries.map((e) => release(e, true)));
  };
  const close = async () => { await Promise.all(idle.splice(0).map((e) => e.browser.close().catch(() => {}))); };
  return {capture, warm, close};
}
