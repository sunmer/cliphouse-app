// Browser smoke test: gallery facets, brand colors, editor scene focus. Captures screenshots.
const {chromium} = require('playwright');
const manifest = require('../src/catalog/manifest.json');

const assert = (cond, msg) => {
  if (!cond) throw new Error('ASSERT: ' + msg);
};

(async () => {
  const base = process.env.URL || 'http://localhost:5180/voodoo/';
  const {templateMeta} = await import('../src/videos/meta.ts');
  const visible = manifest.variants.filter((v) => !v.hidden);
  const expectedVertical = visible.filter((v) => templateMeta[v.template].width / templateMeta[v.template].height < 0.7).length;
  const browser = await chromium.launch();
  const errs = [];
  const report = {};
  for (const vp of [{width: 1440, height: 900, n: 'desktop'}, {width: 390, height: 844, n: 'mobile'}]) {
    const page = await browser.newPage({viewport: {width: vp.width, height: vp.height}});
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1200);
    const total = await page.locator('.card').count();

    // Facet: 9:16 format only.
    const toggle = page.locator('.filters-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.locator('.chip', {hasText: '9:16'}).click();
    const vertical = await page.locator('.card').count();
    await page.screenshot({path: `/tmp/voodoo-gallery-${vp.n}.png`, scale: 'css'});
    await page.locator('.chip', {hasText: '9:16'}).click();
    if (await toggle.isVisible()) await toggle.click();

    // Brand colors: pick one palette, every card previews it as a live frame.
    const sorbet = {background: '#fff1f2', accent: '#e11d48'};
    const firstMedia = page.locator('.card .media').first();
    const originalBg = await firstMedia.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.locator('.brand-strip .palette-btn[aria-label="Sorbet"]').click();
    await page.waitForTimeout(1500);
    const kitThumbs = await page.locator('.card .media .__remotion-player').count();
    const kitImgs = await page.locator('.card .media img').count();
    const kitBg = await firstMedia.evaluate((el) => getComputedStyle(el).backgroundColor);
    const switchOn = await page.getByRole('switch', {name: 'Brand colors'}).isChecked();
    await page.getByRole('button', {name: 'Customize colors'}).click();
    const stripHex = await page.locator('#brand-hex-background').inputValue();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({path: `/tmp/voodoo-kit-${vp.n}.png`, scale: 'css'});
    await page.getByRole('button', {name: 'Customize colors'}).click();

    // Editor: an untouched video opens in the brand colors; Reset restores the template preset.
    await page.goto(base + '#/v/stack-kicklab');
    await page.waitForTimeout(1000);
    await page.getByRole('button', {name: 'Pause', exact: true}).click();
    await page.locator('.scene').nth(1).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', {name: 'Edit List items', exact: true}).first().click();
    const linked = await page.locator('.scene.linked').innerText();
    await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
    const applyVisible = await page.getByRole('button', {name: 'Apply brand kit', exact: true}).count();
    await page.getByRole('button', {name: 'Theme', exact: true}).click();
    const bgHex = () => page.getByLabel('Background hex').inputValue();
    const editorBg = await bgHex();
    await page.screenshot({path: `/tmp/voodoo-editor-${vp.n}.png`, scale: 'css'});
    await page.getByRole('button', {name: 'Reset to original', exact: true}).click();
    await page.waitForTimeout(300);
    const resetBg = await bgHex();

    // Turning the kit off brings back the original card previews.
    await page.goto(base);
    await page.waitForTimeout(800);
    await page.getByRole('switch', {name: 'Brand colors'}).uncheck();
    await page.waitForTimeout(800);
    const offPlayers = await page.locator('.card .media .__remotion-player').count();
    const offImgs = await page.locator('.card .media img').count();
    const offBg = await page.locator('.card .media').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.close();
    report[vp.n] = {total, vertical, kitThumbs, kitImgs, kitBg, stripHex, overflow, linked, applyVisible, editorBg, resetBg, offPlayers, offImgs};
    assert(total === visible.length && vertical === expectedVertical, `facet counts ${total}/${vertical}`);
    assert(linked === 'List', 'focus links point to list scene');
    assert(switchOn && kitThumbs > 0 && kitImgs === 0, 'kit cards switch to live previews');
    assert(kitBg === 'rgb(255, 241, 242)' && kitBg !== originalBg, `kit card background ${kitBg}`);
    assert(stripHex === sorbet.background, 'strip swatches show the kit theme');
    assert(overflow <= 0, `no horizontal overflow (${overflow}px)`);
    assert(applyVisible === 0, 'no Apply brand kit button');
    assert(editorBg === sorbet.background, `editor opens in kit colors (${editorBg})`);
    assert(resetBg === '#111111', `reset restores the preset (${resetBg})`);
    assert(offPlayers === 0 && offImgs > 0 && offBg === originalBg, 'kit off restores original previews');
  }
  console.log(JSON.stringify({report, errs}));
  await browser.close();
  if (errs.length) process.exit(1);
})();
