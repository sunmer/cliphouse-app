// Account gate smoke test. Needs a build with Firebase configured, e.g.
//   npx vite --mode production --port 5191  then  URL=http://localhost:5191/voodoo/ node scripts/smoke-gate.cjs
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://127.0.0.1:5180/voodoo/';
const ids = manifest.variants.filter((v) => !v.hidden).map((v) => v.id);
// A normal desktop user agent: headless Chromium identifies itself and is never gated.
const human = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
      const context = await browser.newContext({viewport, userAgent: human});
      await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', {get: () => false}));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const dialog = page.locator('dialog[aria-labelledby="account-title"]');
      const open = async (hash) => {
        await page.goto(`${base}#/${hash}`);
        await page.locator('.immersive-editor').waitFor();
        await page.waitForTimeout(600);
      };

      await open(`v/${ids[0]}`);
      assert.equal(await dialog.isVisible(), false, 'first video is free');
      await open(`v/${ids[1]}`);
      await dialog.waitFor({state: 'visible'});
      assert.match(await dialog.innerText(), /Keep going with a free account/);
      await page.getByRole('button', {name: 'Not now'}).click();
      await dialog.waitFor({state: 'hidden'});
      await open(`v/${ids[2]}`);
      assert.equal(await dialog.isVisible(), false, 'third video is free and the soft prompt shows once');

      await open(`v/${ids[3]}`);
      await dialog.waitFor({state: 'visible'});
      const text = await dialog.innerText();
      assert.match(text, /Create a free account to keep going/);
      assert.match(text, /Sign in or create an account with Google/);
      assert.equal(await page.getByRole('button', {name: 'Close account'}).count(), 0, 'gate has no close button');
      assert.equal(await page.locator('main.editor-page').getAttribute('inert'), '', 'editor is inert behind the gate');
      await page.screenshot({path: `/tmp/cliphouse-gate-${viewport.width}.png`});
      await page.keyboard.press('Escape');
      await page.mouse.click(5, viewport.height - 5);
      await page.waitForTimeout(300);
      assert.equal(await dialog.isVisible(), true, 'Escape and backdrop do not dismiss the gate');
      await page.getByRole('button', {name: 'Back to gallery'}).click();
      await page.locator('.card').first().waitFor();
      assert.equal(await dialog.isVisible(), false);
      assert.equal(new URL(page.url()).hash, '#/');

      await open(`v/${ids[0]}`);
      assert.equal(await dialog.isVisible(), false, 'previously opened videos stay free');
      const props = encodeURIComponent(JSON.stringify(manifest.variants.find((v) => v.id === ids[4]).props));
      await open(`v/${ids[4]}?props=${props}`);
      assert.equal(await dialog.isVisible(), false, 'agent handoff links are never gated');
      assert.deepEqual(errors, []);
      await context.close();
    }

    const bot = await browser.newContext();
    const page = await bot.newPage();
    for (const id of ids.slice(0, 5)) {
      await page.goto(`${base}#/v/${id}`);
      await page.locator('.immersive-editor').waitFor();
    }
    await page.waitForTimeout(600);
    assert.equal(await page.locator('dialog[aria-labelledby="account-title"]').isVisible(), false, 'automated browsers are never gated');
    await bot.close();
    console.log('Soft prompt, hard gate, exemptions, and automated-browser bypass passed.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
