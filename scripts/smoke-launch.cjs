// Browser checks for the launch set: music picker, sync and fades in the editor, the row list editor,
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

      // The list editor: one row per item, edited with the mouse and with the keyboard, saved as one undo step.
      if (v.props.texts.list) {
        const items = v.props.texts.list.split('\n');
        const fs = require('node:fs');
        const score = JSON.parse(fs.readFileSync(`src/videos/${v.template}/score.json`, 'utf8'));
        const {min, max, itemMax} = score.list;
        // Pause, then scrub to the end of the list scene, where every item is on screen.
        const beats = (i) => score.scenes.slice(0, i).reduce((n, s) => n + s.bars * 4, 0);
        const total = beats(score.scenes.length);
        const at = (beats(score.list.scene + 1) - 0.75) / total;
        const pause = async () => { if (await page.getByRole('button', {name: 'Pause', exact: true}).count()) await page.getByRole('button', {name: 'Pause', exact: true}).click(); };
        const scrub = async () => {
          await pause();
          const strip = await page.locator('.timeline').boundingBox();
          await page.mouse.click(strip.x + strip.width * at, strip.y + strip.height / 2);
          await page.waitForTimeout(800);
          await pause();
        };
        const label = score.list.label ?? 'List items';
        const editor = page.getByRole('group', {name: `Edit ${label}`});
        const rowInputs = editor.locator('.list-row input');
        const values = () => rowInputs.evaluateAll((els) => els.map((e) => e.value));
        const savedList = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.texts.list ?? null, `voodoo:v2:${v.id}`);
        const shownRows = () => page.evaluate(() => {
          const iframe = document.querySelector('hyperframes-player')?.shadowRoot?.querySelector('iframe') ?? document.querySelector('hyperframes-player iframe');
          return iframe?.contentDocument ? iframe.contentDocument.querySelectorAll('[data-list-part="row"]').length : null;
        });
        // Open on a list item. The selected row follows the tapped item.
        const open = async () => {
          await scrub();
          const hits = page.getByRole('button', {name: 'Edit List items', exact: true});
          await hits.first().waitFor({timeout: 10000});
          await hits.first().click();
          await editor.waitFor();
        };
        const save = page.getByRole('button', {name: 'Save list', exact: true});
        const undo = page.getByRole('button', {name: 'Undo', exact: true});

        // 1. Rows match the saved list, with limits, a per-row count, and the tapped item selected and highlighted.
        await open();
        assert.deepEqual(await values(), items, `${v.id}: one row per item`);
        assert.match(await editor.locator('.list-head .counter').innerText(), new RegExp(`${items.length}/${max}.*min ${min}`), `${v.id}: limits show`);
        assert.equal(await editor.locator('.list-row').first().locator('.row-count').innerText(), `${items[0].length}/${itemMax}`, `${v.id}: row character count`);
        assert.equal(await editor.locator('.list-row.selected').count(), 1, `${v.id}: one row is selected`);
        assert.equal(await editor.locator('.list-row.selected input').evaluate((e) => e === document.activeElement), true, `${v.id}: the selected row has focus`);
        assert.ok(await page.locator('.list-focus').count() >= 1, `${v.id}: the selected item is highlighted in the video`);
        // Selecting another row moves the highlight in the video.
        if (items.length > 1) {
          const before = await page.locator('.list-focus').first().boundingBox();
          await rowInputs.nth(1).click();
          const after = await page.locator('.list-focus').first().boundingBox();
          assert.ok(after && before && Math.abs(after.y - before.y) + Math.abs(after.x - before.x) > 4, `${v.id}: the highlight follows the selected row`);
          await rowInputs.first().click();
        }

        // 2. Mouse: delete the first row, move the new first row down, then save. Undo once restores the preset.
        if (items.length > Math.max(1, min)) {
          await editor.getByRole('button', {name: 'Delete item 1', exact: true}).click();
          const after = items.slice(1);
          if (after.length > 1) {
            await editor.getByRole('button', {name: 'Move item 1 down', exact: true}).click();
            [after[0], after[1]] = [after[1], after[0]];
          }
          assert.deepEqual(await values(), after, `${v.id}: delete and reorder update the rows`);
          await save.click();
          await page.waitForTimeout(500);
          assert.equal(await savedList(), after.join('\n'), `${v.id}: the edit is saved as packed lines`);
          const shown = await shownRows();
          if (shown !== null) assert.equal(shown, after.length, `${v.id}: the video shows ${after.length} rows`);
          await undo.click();
          await page.waitForTimeout(300);
          assert.equal(await savedList(), v.props.texts.list, `${v.id}: one undo restores the whole list edit`);
        }

        // 3. Keyboard: Enter on the last row adds a row up to max; Backspace on an empty row removes it; Escape cancels.
        await open();
        await rowInputs.last().focus();
        const addable = max - items.length;
        for (let k = 0; k < addable; k++) { await page.keyboard.press('Enter'); await page.keyboard.type(`Extra ${k + 1}`); }
        assert.equal(await rowInputs.count(), max, `${v.id}: Enter adds rows up to max`);
        assert.equal(await editor.getByRole('button', {name: 'Add item', exact: true}).count(), 0, `${v.id}: no add button at max`);
        await page.keyboard.press('Enter');
        assert.equal(await rowInputs.count(), max, `${v.id}: Enter does not add past max`);
        if (addable > 0) {
          await page.keyboard.press('ControlOrMeta+a');
          await page.keyboard.press('Backspace');
          await page.keyboard.press('Backspace');
          assert.equal(await rowInputs.count(), max - 1, `${v.id}: Backspace on an empty row removes it`);
        }
        // Enter on an inner row moves to the next row.
        await rowInputs.first().focus();
        await page.keyboard.press('Enter');
        assert.equal(await rowInputs.nth(1).evaluate((e) => e === document.activeElement), true, `${v.id}: Enter advances to the next row`);
        await page.keyboard.press('Escape');
        await editor.waitFor({state: 'detached'});
        assert.equal(await savedList(), v.props.texts.list, `${v.id}: Escape cancels without saving`);

        // 4. Limits: an overlong row and a list under min cannot be saved. The cancel button discards.
        await open();
        await rowInputs.first().fill('x'.repeat(itemMax + 1));
        assert.equal(await save.isDisabled(), true, `${v.id}: an overlong row cannot be saved`);
        assert.match(await editor.locator('.list-row').first().locator('.row-count').getAttribute('class'), /error/, `${v.id}: the row count shows the error`);
        await rowInputs.first().fill(items[0]);
        assert.equal(await save.isDisabled(), false, `${v.id}: a valid list can be saved`);
        while (await rowInputs.count() > Math.max(1, min)) await editor.locator('.list-row').last().getByRole('button', {name: /^Delete item/}).click();
        assert.equal(await editor.locator('.list-row').first().getByRole('button', {name: /^Delete item/}).isDisabled(), true, `${v.id}: delete stops at min`);
        await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
        assert.equal(await savedList(), v.props.texts.list, `${v.id}: cancel discards row edits`);

        // 5. Keyboard save: edit a row and save with Mod+Enter, then one undo restores it.
        await open();
        await rowInputs.first().fill(`${items[0].slice(0, itemMax - 2)}!`);
        await page.keyboard.press('ControlOrMeta+Enter');
        await editor.waitFor({state: 'detached'});
        const edited = [`${items[0].slice(0, itemMax - 2)}!`, ...items.slice(1)].join('\n');
        assert.equal(await savedList(), edited, `${v.id}: Mod+Enter saves`);
        await undo.click();
        await page.waitForTimeout(300);
        assert.equal(await savedList(), v.props.texts.list, `${v.id}: one undo restores a keyboard save`);
        console.log(`${v.id}: list editor checks passed (${items.length} items, ${min}-${max})`);
      }
    }
    if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`);
    console.log(`Launch smoke passed for ${variants.length} variants.`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
