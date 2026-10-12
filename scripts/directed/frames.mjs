// Grab frames and text boxes from either engine, so the direction gates and review sheets work the same way
// for Remotion and HyperFrames. A Playwright page is driven to exact frames:
//   Remotion: a small Vite page with @remotion/player (scripts/directed/gate-page), seeked with seekTo.
//   HyperFrames: the bound project HTML, seeked through the registered GSAP timeline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {templateMeta} from '../../src/videos/meta.ts';
import {engineOf} from '../../src/videos/engine.ts';
import {writeHyperframesProject} from '../../server/hyperframes.ts';

const root = path.resolve(import.meta.dirname, '../..');
let server;
async function gateServer() {
  if (server) return server;
  server = await createServer({root, configFile: false, plugins: [react()], logLevel: 'error', server: {port: 0, host: '127.0.0.1'}});
  await server.listen();
  return server;
}
export async function closeServer() { await server?.close(); server = undefined; }

// Text boxes, visibility, and clipping of every data-text-role element, measured in page pixels.
const MEASURE = `(() => {
  const out = [];
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  for (const el of document.querySelectorAll('[data-text-role]')) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, chars = 0, clipped = false;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim()) continue;
      let p = n.parentElement, hidden = false;
      while (p && p !== document.body) {
        const css = getComputedStyle(p);
        if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) < 0.08) hidden = true;
        p = p.parentElement;
      }
      if (hidden) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        // Line boxes are taller than the glyphs; test the central band where caps and x-height sit.
        const inset = r.height * 0.18;
        const g = {l: r.left, t: r.top + inset, r: r.right, b: r.bottom - inset};
        // A glyph box is visible when the clip chain of every ancestor mask still shows most of it.
        let vis = {...g};
        let a = n.parentElement;
        while (a && a !== document.body) {
          const css = getComputedStyle(a);
          if (css.overflow !== 'visible' || css.clipPath !== 'none') {
            const c = a.getBoundingClientRect();
            let box = {l: c.left, t: c.top, r: c.right, b: c.bottom};
            // inset(top right bottom left) clip-paths shrink the box; percentages are of the element size.
            const cp = css.clipPath;
            if (cp.startsWith('inset(')) {
              const v = cp.slice(6, cp.indexOf(')')).split(' ').filter(Boolean).slice(0, 4).map((x, i) => x.endsWith('%') ? parseFloat(x) / 100 * (i % 2 ? c.width : c.height) : parseFloat(x) || 0);
              const [it, ir = it, ib = it, il = ir] = v;
              box = {l: c.left + il, t: c.top + it, r: c.right - ir, b: c.bottom - ib};
            }
            vis = {l: Math.max(vis.l, box.l), t: Math.max(vis.t, box.t), r: Math.min(vis.r, box.r), b: Math.min(vis.b, box.b)};
          }
          a = a.parentElement;
        }
        vis = {l: Math.max(vis.l, 0), t: Math.max(vis.t, 0), r: Math.min(vis.r, W), b: Math.min(vis.b, H)};
        const shown = Math.max(0, vis.r - vis.l) * Math.max(0, vis.b - vis.t) / ((g.r - g.l) * (g.b - g.t));
        if (shown < 0.5) continue;
        if (shown < 0.97) clipped = true;
        chars += n.textContent.trim().length;
        left = Math.min(left, vis.l); top = Math.min(top, vis.t); right = Math.max(right, vis.r); bottom = Math.max(bottom, vis.b);
      }
    }
    if (chars) out.push({role: el.dataset.textRole, left, top, right, bottom, clipped, text: el.textContent.trim()});
  }
  return out;
})()`;

export async function openTemplate(browser, id, props) {
  const meta = templateMeta[id];
  const page = await browser.newPage({viewport: {width: meta.width, height: meta.height}});
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const ready = async (fn, label) => {
    try { await page.waitForFunction(fn, null, {timeout: 30_000}); }
    catch { throw new Error(`${id}: ${label} timed out. Page errors: ${pageErrors.join(' | ') || 'none'}`); }
  };
  if (engineOf(id) === 'hyperframes') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gate-${id}-`));
    await writeHyperframesProject({template: id, props, meta}, dir);
    const vars = fs.readFileSync(path.join(dir, 'variables.json'), 'utf8');
    // Same document the editor player loads: render variables first, then the HyperFrames runtime.
    fs.copyFileSync(path.join(root, 'public/hyperframes/runtime/hyperframe.runtime.iife.js'), path.join(dir, 'runtime.js'));
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
      .replace('<head>', `<head><script>window.__hfVariables=${vars};</script>`)
      .replace('</head>', '<script src="runtime.js"></script></head>');
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    await page.goto(`file://${dir}/index.html`);
    await page.evaluate(() => document.fonts.ready);
    await ready(() => !!window.__timelines?.main, 'timeline registration');
    return {
      page, meta,
      seek: async (frame) => { await page.evaluate((t) => { window.__timelines.main.pause(); window.__timelines.main.totalTime(t, true); }, frame / meta.fps); },
      close: async () => { await page.close(); fs.rmSync(dir, {recursive: true, force: true}); },
    };
  }
  const s = await gateServer();
  const url = new URL(`${s.resolvedUrls.local[0]}scripts/directed/gate-page/index.html`);
  url.searchParams.set('id', id);
  url.searchParams.set('props', JSON.stringify(props));
  await page.goto(url.href);
  await ready(() => window.gateReady === true, 'Remotion player');
  await page.evaluate(() => document.fonts.ready);
  return {
    page, meta,
    seek: (frame) => page.evaluate((f) => window.gateSeek(f), frame),
    close: () => page.close(),
  };
}

/** Grab a frame: a small grayscale thumbnail for motion checks, and the text boxes. */
export async function grab(t, frame, {png} = {}) {
  await t.seek(frame);
  const boxes = await t.page.evaluate(MEASURE);
  const shot = await t.page.screenshot({type: 'png', ...(png ? {path: png} : {})});
  return {boxes, shot};
}

export const launch = () => chromium.launch({args: ['--allow-file-access-from-files']});
