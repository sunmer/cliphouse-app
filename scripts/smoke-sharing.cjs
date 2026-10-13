const {openPanel, menuAction} = require("./smoke-helpers.cjs");
const {chromium, webkit, devices} = require('playwright');
const assert = require('node:assert/strict');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://127.0.0.1:5183/';
const ios = process.argv.includes('--ios');
const id = 'abcdefghijklmnopqrstuvwxyz123456';
const variant = manifest.variants[0];
const props = structuredClone(variant.props);
props.texts.headline = 'SHARED NOT LOCAL';
const data = {id, variantId: variant.id, props, title: props.texts.headline,
  url: `https://cliphou.se/s/${id}`, image: new URL(`previews/${variant.id}.jpg`, base).href};

(async () => {
  const browser = await (ios ? webkit : chromium).launch();
  try {
    for (const viewport of ios ? [{width: 390, height: 844}] : [{width: 1440, height: 900}, {width: 390, height: 844}, {width: 320, height: 740}]) {
      const context = await browser.newContext(ios ? {...devices['iPhone 15'], viewport} : {viewport});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/api/shares/*', (route) => route.fulfill({json: data}));
      await page.goto(base);
      await page.locator('.card-edit').first().waitFor();
      assert.equal(await page.locator('.card-edit').count(), manifest.variants.filter((v) => !v.hidden).length);
      assert.equal(await page.locator('.stats,.card-meta').count(), 0);
      assert.equal(await page.getByText('Most remixed', {exact: true}).count(), 0);
      assert.ok(!(await page.locator('.grid').innerText()).includes('@'));
      await page.locator('.card-edit').first().click();
      await (await menuAction(page, 'Share to socials')).click();
      const dialog = page.getByRole('dialog', {name: 'Share video'});
      await dialog.waitFor({state: 'visible'});
      assert.equal(await page.getByRole('button', {name: /Download props/}).count(), 0);
      assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({path: `/tmp/cliphouse-share-${ios ? 'ios-' : ''}${viewport.width}.png`, scale: 'css'});
      await page.getByRole('button', {name: 'Close share', exact: true}).click();
      await page.evaluate(({variant, props}) => localStorage.setItem(`voodoo:v2:${variant.id}`, JSON.stringify({...props, texts: {...props.texts, headline: 'LOCAL DRAFT'}})), {variant, props});
      await page.goto(new URL(`/s/${id}`, base).href);
      await page.locator('.immersive-editor').waitFor();
      await page.getByRole('button', {name: 'Pause', exact: true}).click();
      const stored = await page.evaluate((id) => JSON.parse(localStorage.getItem(`voodoo:v2:share:${id}`)), id);
      assert.equal(stored.texts.headline, 'SHARED NOT LOCAL');
      assert.equal(await page.evaluate((variant) => JSON.parse(localStorage.getItem(`voodoo:v2:${variant.id}`)).texts.headline, variant), 'LOCAL DRAFT');
      const bounds = await page.locator('.immersive-editor').boundingBox();
      if (viewport.width > 1024) assert.ok(bounds.width < viewport.width, 'desktop remains contained');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('link', {name: 'All videos', exact: true}).click();
      await page.locator('.card-edit').first().waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    if (process.env.TEST_LOGIN === 'true') {
      const context = await browser.newContext({viewport: {width: 390, height: 844}});
      const page = await context.newPage();
      let sent;
      let attempts = 0;
      await page.route('**/api/shares', async (route) => {
        sent = route.request().postDataJSON();
        assert.match(route.request().headers().authorization, /^Bearer /);
        attempts++;
        if (attempts === 1) await route.fulfill({status: 503, json: {error: 'Please retry publishing.'}});
        else await route.fulfill({json: {...data, props: sent.props}});
      });
      await page.route(`**/api/shares/${id}`, (route) => route.fulfill({json: {...data, props: sent?.props || props}}));
      await page.goto(`${base}#/v/${variant.id}`);
      await (await menuAction(page, 'Share to socials')).click();
      await page.getByRole('button', {name: 'Sign in to publish', exact: true}).click();
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', {name: 'Sign in with Google', exact: true}).click();
      const popup = await popupPromise;
      await popup.waitForLoadState('networkidle');
      await popup.getByText('Add new account', {exact: true}).click();
      await popup.locator('#email-input').fill(`share-${Date.now()}@example.test`);
      await popup.locator('#display-name-input').fill('Share test');
      await popup.getByRole('button', {name: 'Sign in with Google.com', exact: true}).click();
      await page.getByRole('alert').filter({hasText: 'Please retry publishing.'}).waitFor();
      await page.getByRole('button', {name: 'Publish link', exact: true}).click();
      await page.getByRole('textbox', {name: 'Public link', exact: true}).waitFor();
      assert.equal(await page.getByRole('textbox', {name: 'Public link', exact: true}).inputValue(), data.url);
      assert.deepEqual(sent, {variantId: variant.id, props: variant.props});
      assert.equal(attempts, 2);
      assert.equal(new URL(page.url()).hash, `#/s/${id}?share=1`);
      assert.equal(await page.locator('.share-preview').evaluate((el) => el.tagName), 'IMG');
      await page.screenshot({path: `/tmp/cliphouse-published-${ios ? 'ios' : 'chromium'}.png`, scale: 'css'});
      await context.close();
    }
    console.log(`Gallery editing, share dialog, immutable shared props, local-draft isolation, and responsive layouts passed (${ios ? 'iOS WebKit' : 'Chromium'}).`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
