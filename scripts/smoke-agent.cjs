// Browser checks for agent handoff links, the copy action, and source downloads.
const {openPanel, menuAction} = require("./smoke-helpers.cjs");
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://127.0.0.1:5180/voodoo/';

(async () => {
  const browser = await chromium.launch();
  try {
    const variant = manifest.variants.find((v) => v.template === 'stack' && !v.hidden);
    const context = await browser.newContext({viewport: {width: 1280, height: 860}, permissions: ['clipboard-read', 'clipboard-write']});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const edited = structuredClone(variant.props);
    edited.texts.headline = 'AGENT & CO #1';
    edited.theme.accent = '#ff2266';
    await page.goto(`${base}#/v/${variant.id}?props=${encodeURIComponent(JSON.stringify(edited))}`);
    await page.locator('.immersive-editor').waitFor();
    await page.waitForFunction(() => !location.hash.includes('props='));
    await openPanel(page, 'Theme');
    assert.equal(await page.locator('#hex-accent').inputValue(), '#ff2266');
    const stored = await page.evaluate((id) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)), variant.id);
    assert.deepEqual(stored, edited, 'valid handoff loads exactly');
    assert.equal(await page.locator('.editor-notice').count(), 0);

    await (await menuAction(page, 'Copy agent link')).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, new RegExp(`/templates/${variant.id}/agent\\.json`));
    const link = copied.match(/Current edit: (\S+)/)[1];
    assert.deepEqual(JSON.parse(new URLSearchParams(link.split('?')[1]).get('props')), edited, 'copied link round-trips');
    const href = await (await menuAction(page, /Download source/)).getAttribute('href');
    assert.match(href, /\/source\/stack\/v\d+\.tar\.gz$/);
    const download = await page.request.get(new URL(href, page.url()).href);
    assert.equal(download.status(), 200);
    assert.ok((await download.body()).length > 10_000);

    // Invalid agent output is reported and does not replace the current edit.
    const bad = {...edited, texts: {...edited.texts, headline: 'x'.repeat(80)}};
    await page.goto(`${base}#/v/${variant.id}?props=${encodeURIComponent(JSON.stringify(bad))}`);
    await page.locator('.editor-notice').waitFor();
    assert.match(await page.locator('.editor-notice').innerText(), /Agent link rejected.*headline/s);
    const after = await page.evaluate((id) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)), variant.id);
    assert.deepEqual(after, edited, 'rejected handoff keeps prior edit');
    await page.goto(`${base}#/v/${variant.id}?props=%7Bnot-json`);
    await page.locator('.editor-notice').waitFor();
    assert.match(await page.locator('.editor-notice').innerText(), /not valid JSON/);
    await page.goto(`${base}#/v/${variant.id}?v=999`);
    await page.locator('.editor-notice').waitFor();
    assert.match(await page.locator('.editor-notice').innerText(), /template version/);
    await page.screenshot({path: '/tmp/cliphouse-agent-editor.png'});
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('Agent handoff, rejection, copy link, and source download passed.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
