const {chromium, devices} = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errors = [];
  for (const [name, opts] of [['mobile', devices['iPhone 14']], ['desktop', {viewport: {width: 1440, height: 900}}]]) {
    const p = await (await b.newContext(opts)).newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
    await p.goto('http://localhost:5190/#/v/poc-ticker-list');
    await p.waitForTimeout(2500);
    await p.click('button[aria-label="Pause"]').catch(() => {});
    // Seek into the board scene.
    await p.evaluate(() => {});
    const bar = await p.$('.timeline, [class*=timeline]');
    const box = bar && await bar.boundingBox();
    if (box) await p.mouse.click(box.x + box.width * 0.55, box.y + box.height / 2);
    await p.waitForTimeout(1200);
    await p.screenshot({path: `output/poc/shots/${name}-board.png`});
    const hits = await p.$$eval('.text-hit', (els) => els.map((e) => e.getAttribute('aria-label')));
    console.log(name, 'targets', hits.join('|'));
    const item = await p.$('.text-hit[aria-label="Edit Point 2"]');
    if (!item) { console.log('no point2 target'); continue; }
    await item.click();
    await p.waitForTimeout(300);
    const val = await p.$eval('.inline-editor textarea', (t) => t.value);
    console.log(name, 'draft', JSON.stringify(val));
    await p.screenshot({path: `output/poc/shots/${name}-editor.png`});
    await p.fill('.inline-editor textarea', 'Q&A, live!\nEnds Sunday');
    await p.click('button[aria-label="Save list"]');
    await p.waitForTimeout(800);
    await p.screenshot({path: `output/poc/shots/${name}-two.png`});
    const stored = await p.evaluate(() => localStorage.getItem('voodoo:v2:poc-ticker-list'));
    console.log(name, 'stored', stored.slice(0, 200));
    await p.click('button[aria-label="Undo"]');
    await p.waitForTimeout(300);
    console.log(name, 'after undo', (await p.evaluate(() => localStorage.getItem('voodoo:v2:poc-ticker-list'))).match(/"hidden":\[[^\]]*\]/)[0]);
    await p.click('button[aria-label="Redo"]');
    await p.waitForTimeout(300);
    console.log(name, 'after redo', (await p.evaluate(() => localStorage.getItem('voodoo:v2:poc-ticker-list'))).match(/"hidden":\[[^\]]*\]/)[0]);
    await p.reload(); await p.waitForTimeout(2000);
    console.log(name, 'after reload', (await p.evaluate(() => localStorage.getItem('voodoo:v2:poc-ticker-list'))).match(/"hidden":\[[^\]]*\]/)[0]);
    // Over capacity is rejected.
    await p.click('button[aria-label="Pause"]').catch(() => {});
    if (box) await p.mouse.click(box.x + box.width * 0.55, box.y + box.height / 2);
    await p.waitForTimeout(1000);
    const t = await p.$('.text-hit[aria-label="Edit Point 1"]');
    if (t) {
      await t.click(); await p.waitForTimeout(200);
      await p.fill('.inline-editor textarea', 'a\nb\nc\nd');
      console.log(name, 'over capacity', await p.$eval('.inline-actions > span', (e) => e.textContent), 'save disabled', await p.$eval('button[aria-label="Save list"]', (e) => e.disabled));
      const restore = await p.$('button[aria-label="Restore removed items"]');
      await p.fill('.inline-editor textarea', 'Q&A, live!');
      console.log(name, 'restore button', !!(await p.$('button[aria-label="Restore removed items"]')));
      await p.keyboard.press('Escape');
    }
    await p.click('button[aria-label="Reset to original"]');
    await p.waitForTimeout(300);
  }
  console.log('errors', errors);
  await b.close();
})();
