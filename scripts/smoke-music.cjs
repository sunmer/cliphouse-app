// Browser checks for music templates: muted start, sound toggle, sync during play, scrubbing, scene jumps,
// and loops, inline edits, hide and show, undo and redo, local save, and silent gallery previews.
// Usage: URL=http://127.0.0.1:5180/voodoo/ node scripts/smoke-music.cjs
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://localhost:5180/voodoo/';
const MAX_DRIFT = 0.045;

(async () => {
  const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const page = await (await browser.newContext({viewport: {width: 1440, height: 1000}})).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Record analytics events without loading GA4.
  await page.addInitScript(() => { window.__events = []; window.gtag = (...a) => window.__events.push(a); });
  try {
    // Gallery previews are silent.
    await page.goto(base);
    await page.locator('.card video').first().waitFor();
    assert.equal(await page.locator('.card video').evaluateAll((els) => els.every((v) => v.muted)), true, 'gallery previews must be muted');

    // The older score format only; beat templates have no hidden roles (scripts/smoke-beat.cjs).
    const fs = require('node:fs');
    const oldScore = (id) => !('beatFrames' in JSON.parse(fs.readFileSync(`src/videos/${id}/score.json`, 'utf8')));
    for (const t of manifest.templates.filter((t) => t.music && oldScore(t.id))) {
      if (process.env.TEMPLATE && t.id !== process.env.TEMPLATE) continue;
      const v = manifest.variants.find((x) => x.template === t.id && !x.hidden);
      const key = `voodoo:v2:${v.id}`;
      await page.goto(`${base}#/v/${v.id}`);
      await page.evaluate((k) => localStorage.removeItem(k), key);
      await page.reload();
      await page.getByRole('heading', {name: v.title, exact: true}).waitFor();
      const sound = page.locator('.sound-btn');
      // Muted at start, even though the video autoplays.
      assert.equal(await sound.getAttribute('aria-pressed'), 'false', `${t.id}: editor must start muted`);
      await page.waitForSelector('.sound-btn[data-audio-ready="true"]', {timeout: 20000});
      const state = () => page.evaluate(() => window.__cliphouseAudio?.());
      assert.equal((await state()).playing, false, `${t.id}: no audio before the toggle`);
      // Sound on: audio plays in sync with the picture.
      await sound.click();
      assert.equal(await sound.getAttribute('aria-pressed'), 'true');
      if (!await page.getByRole('button', {name: 'Pause', exact: true}).count()) await page.getByRole('button', {name: 'Play', exact: true}).click();
      await page.waitForTimeout(1200);
      let s = await state();
      assert.equal(s.playing, true, `${t.id}: audio plays after the toggle`);
      assert.ok(Math.abs(s.drift) < MAX_DRIFT, `${t.id}: drift ${s.drift} s while playing`);
      // Scene jump: keyboard activation seeks to the scene focus and pauses; audio stops.
      await page.locator('.timeline .scene').nth(1).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      assert.equal((await state()).playing, false, `${t.id}: scene jump pauses audio`);
      // Play from the jump point: audio resumes at the new frame.
      await page.getByRole('button', {name: 'Play', exact: true}).click();
      await page.waitForTimeout(700);
      s = await state();
      assert.ok(s.playing && Math.abs(s.drift) < MAX_DRIFT, `${t.id}: drift ${s.drift} s after the scene jump`);
      // Scrub while playing: audio follows the playhead and resumes when the pointer lifts.
      const strip = await page.locator('.timeline').boundingBox();
      await page.mouse.move(strip.x + strip.width * 0.2, strip.y + strip.height / 2);
      await page.mouse.down();
      await page.mouse.move(strip.x + strip.width * 0.6, strip.y + strip.height / 2, {steps: 6});
      assert.equal((await state()).playing, false, `${t.id}: audio pauses while scrubbing`);
      await page.mouse.up();
      await page.waitForTimeout(700);
      s = await state();
      assert.ok(s.playing && Math.abs(s.drift) < MAX_DRIFT, `${t.id}: drift ${s.drift} s after scrubbing`);
      // Loop: let playback wrap and check the audio restarted at the top.
      const seconds = t.id === 'featuredrop' ? 7.5 : t.id === 'beatreel' ? 16 : t.id === 'productpulse' ? 10 : 12;
      await page.locator('.timeline .scene').last().focus();
      await page.keyboard.press('Enter');
      await page.getByRole('button', {name: 'Play', exact: true}).click();
      await page.waitForFunction(() => { const s = window.__cliphouseAudio?.(); return s && s.frame < 30 && s.playing; }, null, {timeout: (seconds + 4) * 1000});
      await page.waitForTimeout(500);
      s = await state();
      assert.ok(Math.abs(s.drift) < MAX_DRIFT, `${t.id}: drift ${s.drift} s after the loop`);
      // Sound off.
      await sound.click();
      await page.waitForTimeout(150);
      assert.equal((await state()).playing, false, `${t.id}: mute stops audio`);
      await page.getByRole('button', {name: 'Pause', exact: true}).click();

      // Hide and show an optional role, with undo and redo. Hidden state is saved locally.
      const role = t.id === 'beatreel' ? 'Point 3' : t.id === 'featuredrop' ? 'Subhead' : 'Point 3';
      const roleKey = {'Point 3': 'point3', Subhead: 'subhead'}[role];
      const hide = page.getByRole('button', {name: `Hide ${role}`, exact: true});
      await hide.click();
      await page.getByRole('button', {name: `Show ${role}`, exact: true}).waitFor();
      assert.deepEqual(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).hidden, key), [roleKey]);
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      assert.deepEqual(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).hidden, key), []);
      await page.getByRole('button', {name: 'Redo', exact: true}).click();
      assert.deepEqual(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).hidden, key), [roleKey]);
      await page.getByRole('button', {name: `Show ${role}`, exact: true}).click();
      // Required roles have no hide control.
      for (const required of ['Brand', 'Headline', 'Call to action']) assert.equal(await page.getByRole('button', {name: `Hide ${required}`, exact: true}).count(), 0);
      // Export sound switch is part of the saved props.
      const exportSound = page.getByLabel('Include sound in MP4');
      assert.equal(await exportSound.isChecked(), true);
      await exportSound.uncheck();
      assert.deepEqual(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).audio, key), {enabled: false});
      await page.getByRole('button', {name: 'Undo', exact: true}).click();

      // Inline edit: the headline changes, the mix re-renders, and the length stays the same.
      await page.locator('.timeline .scene').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const hit = page.locator('.text-hit[aria-label="Edit Headline"]').first();
      await hit.click();
      const field = page.getByRole('textbox', {name: 'Headline', exact: true});
      await field.fill('Made for motion');
      await page.getByRole('button', {name: 'Save text', exact: true}).click();
      assert.equal(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).texts.headline, key), 'Made for motion');
      await page.waitForSelector('.sound-btn[data-audio-ready="true"]');
      const duration = await page.evaluate(() => window.__cliphouseAudio?.().duration);
      assert.ok(Math.abs(duration - seconds) < 0.001, `${t.id}: mix length ${duration} s after an edit`);
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      console.log(`ok ${t.id}`);
    }
    const names = await page.evaluate(() => window.__events.filter((e) => e[0] === 'event').map((e) => e[1]));
    for (const n of ['sound_toggle', 'role_toggle', 'sound_play']) assert.ok(names.includes(n) || !process.env.VITE_GA_MEASUREMENT_ID, `missing ${n} event`);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
