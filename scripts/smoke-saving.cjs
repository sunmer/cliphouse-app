const {openPanel, menuAction} = require("./smoke-helpers.cjs");
const {chromium, webkit, devices} = require('playwright');
const assert = require('node:assert/strict');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://127.0.0.1:5183/';
const ios = process.argv.includes('--ios');
const variant = manifest.variants[0];
const props = structuredClone(variant.props);
props.texts.headline = 'MY PRIVATE EDIT';

(async () => {
  const browser = await (ios ? webkit : chromium).launch();
  try {
    const context = await browser.newContext(ios ? devices['iPhone 15'] : {viewport: {width: 390, height: 844}});
    const page = await context.newPage();
    const errors = [];
    const emulatorWarnings = [];
    page.on('pageerror', (e) => {
      // WebKit reports aborted cross-origin emulator streams as CORS errors on reload.
      if (ios && /^\/127\.0\.0\.1:8080\/google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel\?.* due to access control checks\.$/.test(e.message)) {
        emulatorWarnings.push(e.message);
      } else errors.push(e.message);
    });
    await page.goto(base);
    await page.locator('.card-edit').first().waitFor();
    await page.evaluate(({variant, props}) => localStorage.setItem(`voodoo:v2:${variant.id}`, JSON.stringify(props)), {variant, props});
    await page.goto(`${base}#/v/${variant.id}`);
    await page.getByRole('button', {name: 'Save video', exact: true}).click();
    await page.getByRole('dialog', {name: 'Sign in', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Close account', exact: true}).click();
    await page.getByRole('status').filter({hasText: 'Sign-in was cancelled'}).waitFor();
    await page.getByRole('button', {name: 'Save video', exact: true}).click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', {name: 'Sign in with Google', exact: true}).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    await popup.getByText('Add new account', {exact: true}).click();
    await popup.locator('#email-input').fill(`save-${Date.now()}@example.test`);
    await popup.locator('#display-name-input').fill('Save test');
    await popup.getByRole('button', {name: 'Sign in with Google.com', exact: true}).click();
    await page.waitForURL(/#\/d\/[a-z0-9]{32}$/);
    const savedUrl = page.url();
    await page.locator('.immersive-editor').waitFor();
    await page.reload();
    await page.locator('.immersive-editor').waitFor();
    await (await menuAction(page, 'Share to socials')).click();
    await page.getByRole('dialog', {name: 'Share video'}).getByText('MY PRIVATE EDIT', {exact: true}).first().waitFor();
    await page.getByRole('button', {name: 'Close share', exact: true}).click();
    await page.getByRole('link', {name: 'All videos', exact: true}).click();
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('region', {name: 'Saved videos'}).getByRole('link', {name: 'MY PRIVATE EDIT', exact: true}).waitFor();
    await page.screenshot({path: `/tmp/cliphouse-saved-${ios ? 'ios' : 'chromium'}.png`, scale: 'css'});
    await page.getByRole('button', {name: 'Sign out', exact: true}).click();
    await page.goto(savedUrl);
    await page.getByRole('heading', {name: 'Private video', exact: true}).waitFor();
    assert.equal(await page.locator('.immersive-editor').count(), 0);
    assert.ok(!(await page.locator('body').innerText()).includes('MY PRIVATE EDIT'));
    assert.deepEqual(errors, []);
    await context.close();
    if (emulatorWarnings.length) console.log(`WebKit emitted ${emulatorWarnings.length} local-emulator stream warnings during reload; all persistence and privacy assertions passed.`);
    console.log(`Private save resumes after sign-in, survives reload, appears in account, and stays private after logout (${ios ? 'iOS' : 'Chromium'}).`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
