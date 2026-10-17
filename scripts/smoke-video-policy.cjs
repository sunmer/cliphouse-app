const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const base = process.env.URL || 'http://127.0.0.1:5183/';

async function unloaded(page) {
  await page.waitForFunction(() => document.querySelectorAll('video[src]').length === 0);
}

async function check(engine, viewport, name) {
  const browser = await engine.launch();
  try {
    for (const route of ['benchmark/', '', 'motion-graphics-templates/', 'templates/bento-launch/']) {
      const page = await browser.newPage({viewport});
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base + route);
      const videos = page.locator('video[data-video-src]');
      await videos.first().waitFor({state: 'attached'});
      await videos.first().scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('video[src]')].some(v => !v.paused && v.currentTime > 0.3));
      const invalid = await page.locator('video[src]').evaluateAll(videos => videos.filter(v => {
        const r = v.getBoundingClientRect();
        return r.bottom <= 0 || r.top >= innerHeight || !v.muted || !v.playsInline || v.preload !== 'none';
      }).length);
      assert.equal(invalid, 0, `${name}/${route}: sources only for visible, muted, inline videos`);
      const first = videos.first();
      const pixels = await first.evaluate(v => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 36;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(v, 0, 0, 64, 36);
        return new Set(ctx.getImageData(0, 0, 64, 36).data).size;
      });
      assert.ok(pixels > 10, `${name}/${route}: nonblank decoded frame`);
      await page.screenshot({path: `/tmp/cliphouse-policy-${name}-${route.replaceAll('/', '-') || 'home'}.png`});
      if (route === 'benchmark/') {
        await first.evaluate(video => video.pause());
        await page.waitForTimeout(100);
        await videos.last().scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !document.querySelector('video[data-video-src]').hasAttribute('src'));
        await first.scrollIntoViewIfNeeded();
        await page.locator('.benchmark-card-media:has(video)').first().getByRole('button', {name: /^Play /}).click();
        await page.waitForFunction(() => document.querySelector('.benchmark-card-media video').currentTime > 0.2);
      }
      if (await videos.count() > 1) {
        await videos.last().scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !document.querySelector('video[data-video-src]').hasAttribute('src'));
      }
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {configurable: true, value: true});
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await unloaded(page);
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForFunction(() => document.querySelector('video[src]'));
      await page.emulateMedia({reducedMotion: 'reduce'});
      await unloaded(page);
      assert.deepEqual(errors, []);
      await page.close();
    }

    for (const mode of ['reduce', 'saveData', 'slow', 'blocked']) {
      const page = await browser.newPage({viewport, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference'});
      await page.addInitScript((mode) => {
        if (mode === 'saveData' || mode === 'slow') {
          const connection = new EventTarget();
          connection.saveData = mode === 'saveData';
          connection.effectiveType = mode === 'slow' ? '2g' : '4g';
          Object.defineProperty(navigator, 'connection', {configurable: true, value: connection});
        }
        if (mode === 'blocked') {
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function() {
            if (!window.allowManualPlayback) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
            return play.call(this);
          };
        }
      }, mode);
      const requests = [];
      page.on('request', r => { if (new URL(r.url()).pathname.endsWith('.mp4')) requests.push(r.url()); });
      await page.goto(base + 'benchmark/');
      const first = page.locator('.benchmark-card-media video').first();
      await first.scrollIntoViewIfNeeded();
      await page.waitForTimeout(650);
      await unloaded(page);
      if (mode !== 'blocked') assert.equal(requests.length, 0, `${name}/${mode}: no video bytes requested`);
      if (mode === 'blocked') await page.evaluate(() => { window.allowManualPlayback = true; });
      await page.locator('.benchmark-card-media:has(video)').first().getByRole('button', {name: /^Play /}).click();
      await page.waitForFunction(() => [...document.querySelectorAll('video[src]')].some(v => v.currentTime > 0.2));
      await page.locator('.benchmark-card-media').last().scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.querySelector('.benchmark-card-media video').hasAttribute('src'));
      await page.close();
    }
    console.log(`${name}: viewport loading, offscreen release, autoplay, manual fallback, hidden tabs, reduced motion, data saver, slow networks, and decoded video pixels passed.`);
  } finally { await browser.close(); }
}

(async () => {
  await check(chromium, {width: 1440, height: 1000}, 'desktop');
  await check(webkit, {width: 390, height: 844}, 'mobile-webkit');
})().catch(error => { console.error(error); process.exitCode = 1; });
