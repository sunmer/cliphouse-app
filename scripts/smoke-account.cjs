const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://127.0.0.1:5180/voodoo/';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}, {width: 320, height: 740}]) {
      const context = await browser.newContext({viewport});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base);
      await page.locator('.card').first().waitFor();
      assert.match(await page.locator('.logo').innerText(), /^cliphou\.se/);
      assert.equal(await page.locator('a button').count(), 0, 'no nested interactive star buttons');
      await page.locator('.card-star').first().click();
      await page.getByRole('dialog').waitFor({state: 'visible'});
      assert.equal(new URL(page.url()).hash, '', 'starring does not open editor');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state: 'hidden'});
      assert.equal(await page.getByRole('button', {name: /^(Starred|All videos|Featured|Newest)/}).count(), 0, 'gallery hides collection and sort controls');
      assert.equal(await page.locator('.filters-toggle').isVisible(), viewport.width > 680, 'filters hide on mobile');
      assert.equal(await page.locator('.card').count(), manifest.variants.filter((v) => !v.hidden).length);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, 'gallery fits viewport');
      await page.screenshot({path: `/tmp/cliphouse-gallery-${viewport.width}.png`, scale: 'css'});
      await page.locator('.card-link').first().click();
      await page.locator('.immersive-editor').waitFor();
      await page.locator('.editor-tools .star-button').click();
      await page.getByRole('dialog').waitFor({state: 'visible'});
      await page.keyboard.press('Escape');
      await page.locator('.site-footer a', {hasText: 'Privacy'}).click();
      await page.getByRole('heading', {name: 'Privacy', exact: true}).waitFor();
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
    console.log('Branding, star entry points, simplified toolbar, dialogs, privacy, and responsive layouts passed.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
