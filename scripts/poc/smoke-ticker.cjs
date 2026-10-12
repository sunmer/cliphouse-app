const {chromium, devices} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const p = await (await b.newContext(devices['iPhone 14'])).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://localhost:5190/#/v/${process.env.VARIANT || 'ticker-flashsale'}`);
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(3000);
  await p.click('button[aria-label="Play sound"]');
  await p.waitForTimeout(2500);
  console.log('audio', JSON.stringify(await p.evaluate(() => window.__cliphouseAudio?.())));
  await p.click('button[aria-label="Pause"]');
  const box = await (await p.$('[class*=timeline]')).boundingBox();
  await p.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
  await p.waitForTimeout(1000);
  console.log('facts', await p.$eval('.music-facts', (e) => e.textContent).catch(() => 'none'));
  const t = await p.$('.text-hit[aria-label="Edit List items"]');
  console.log('list target', !!t, await p.$$eval('.text-hit', (els) => els.map((e) => e.getAttribute('aria-label')).join('|')));
  if (t) {
    await t.click(); await p.waitForTimeout(200);
    console.log('draft', JSON.stringify(await p.$eval('.inline-editor textarea', (e) => e.value)));
    await p.fill('.inline-editor textarea', 'Q&A, live!\nEnds Sunday');
    await p.click('button[aria-label="Save list"]'); await p.waitForTimeout(2500);
    console.log('stored', await p.evaluate((k) => localStorage.getItem(k), `voodoo:v2:${process.env.VARIANT || 'ticker-flashsale'}`));
    await p.screenshot({path: 'output/poc/shots/ticker-prod.png'});
  }
  console.log('errors', errors);
  await b.close();
})();
