// Browser checks for the launch set: music picker, sync and fades in the editor, the free-text list editor,
// undo, and persistence. Usage: URL=http://127.0.0.1:5190/ node scripts/smoke-launch.cjs [variant ...]
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://localhost:5180/voodoo/';
const MAX_DRIFT = 0.06;
const TITLES = {'lofi-sunday': 'Sunday Tape', 'lofi-window': 'Window Seat', 'lofi-nightshift': 'Night Shift', 'house-launch': 'Launch Day',
  'house-rooftop': 'Rooftop', 'house-shipit': 'Ship It', 'techno-pulse': 'Pulse', 'techno-grid': 'Grid'};

(async () => {
  const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const page = await (await browser.newContext({viewport: {width: 1440, height: 1000}})).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const only = new Set(process.argv.slice(2));
  const variants = manifest.variants.filter((v) => v.launch && !v.hidden && (!only.size || only.has(v.id)));
  assert.ok(variants.length, 'no visible launch variants');
  const state = () => page.evaluate(() => window.__cliphouseAudio?.());
  try {
    for (const v of variants) {
      await page.goto(`${base}#/v/${v.id}`);
      await page.evaluate((k) => localStorage.removeItem(k), `voodoo:v2:${v.id}`);
      await page.reload();
      await page.getByRole('heading', {name: v.title, exact: true}).waitFor();
      // The music panel lists every track and marks the preset's.
      await page.getByRole('button', {name: 'Music', exact: true}).click();
      const radios = page.getByRole('radiogroup', {name: 'Music track'}).getByRole('radio');
      assert.equal(await radios.count(), 8, `${v.id}: 8 tracks`);
      assert.equal(await page.locator('.track-btn.on').count(), 1, `${v.id}: one track selected`);
      // Picking a track turns sound on and plays it in sync.
      const other = radios.nth(v.props.audio.track === 'techno-grid' ? 0 : 7);
      await other.click();
      assert.equal(await other.getAttribute('aria-checked'), 'true');
      await page.waitForSelector('.sound-btn[data-audio-ready="true"]', {timeout: 20000});
      if (!await page.getByRole('button', {name: 'Pause', exact: true}).count()) await page.getByRole('button', {name: 'Play', exact: true}).click();
      await page.waitForTimeout(1500);
      let s = await state();
      assert.equal(s.playing, true, `${v.id}: track plays after picking`);
      assert.ok(Math.abs(s.drift) < MAX_DRIFT, `${v.id}: drift ${s.drift} s`);
      // Mute stops it.
      await page.locator('.sound-btn').click();
      assert.equal((await state()).playing, false, `${v.id}: mute stops the track`);
      // Undo restores the preset track.
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      assert.equal(await page.locator('.track-btn.on .track-title').innerText(), TITLES[v.props.audio.track], `${v.id}: undo restores the preset track`);

      // The list editor: one line per item. Remove one item, save, and the video shows one row fewer.
      if (v.props.texts.list) {
        const items = v.props.texts.list.split('\n');
        // Pause, then scrub to the end of the list scene, where every item is on screen.
        const fs = require('node:fs');
        const score = JSON.parse(fs.readFileSync(`src/videos/${v.template}/score.json`, 'utf8'));
        const beats = (i) => score.scenes.slice(0, i).reduce((n, s) => n + s.bars * 4, 0);
        const total = beats(score.scenes.length);
        const at = (beats(score.list.scene + 1) - 0.75) / total;
        if (await page.getByRole('button', {name: 'Pause', exact: true}).count()) await page.getByRole('button', {name: 'Pause', exact: true}).click();
        const strip = await page.locator('.timeline').boundingBox();
        await page.mouse.click(strip.x + strip.width * at, strip.y + strip.height / 2);
        await page.waitForTimeout(800);
        if (await page.getByRole('button', {name: 'Pause', exact: true}).count()) await page.getByRole('button', {name: 'Pause', exact: true}).click();
        const hit = page.getByRole('button', {name: 'Edit List items', exact: true}).first();
        await hit.waitFor({timeout: 10000});
        await hit.click();
        const box = page.locator('.list-editor textarea');
        assert.equal(await box.inputValue(), v.props.texts.list, `${v.id}: the editor shows one item per line`);
        await box.fill(items.slice(0, -1).join('\n'));
        await page.getByRole('button', {name: 'Save list', exact: true}).click();
        await page.waitForTimeout(500);
        const rows = await page.evaluate(() => {
          const iframe = document.querySelector('hyperframes-player')?.shadowRoot?.querySelector('iframe') ?? document.querySelector('hyperframes-player iframe');
          return iframe?.contentDocument ? iframe.contentDocument.querySelectorAll('[data-list-item]').length : null;
        });
        const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).texts.list, `voodoo:v2:${v.id}`);
        assert.equal(saved, items.slice(0, -1).join('\n'), `${v.id}: the list edit is saved`);
        if (rows !== null) assert.equal(rows, items.length - 1, `${v.id}: the video shows ${items.length - 1} rows`);
        // Over the item limit: the save button stays disabled.
        await hit.click();
        await box.fill(`${items[0]}\n${'x'.repeat(60)}`);
        assert.equal(await page.getByRole('button', {name: 'Save list', exact: true}).isDisabled(), true, `${v.id}: overlong line cannot be saved`);
        await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
      }
    }
    if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`);
    console.log(`Launch smoke passed for ${variants.length} variants.`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
