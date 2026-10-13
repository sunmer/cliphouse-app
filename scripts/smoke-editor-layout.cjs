const assert = require('node:assert/strict');
const {openPanel, menuAction} = require("./smoke-helpers.cjs");
const {chromium, webkit, devices} = require('playwright');
const base = process.env.URL || 'http://localhost:5180/voodoo/';

async function check(engine, options, name) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage(options);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('crash', () => errors.push('Page crashed'));
    await page.goto(base + '#/v/drop-sale');
    await page.getByRole('button', {name: 'Pause', exact: true}).click();
    await page.locator('.scene').first().click();
    await page.waitForTimeout(250);
    const mobile = !!options.isMobile;
    if (mobile) {
      // Exercise the CSS fallback used when native fullscreen is unavailable.
      await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', {configurable: true, value: false}));
      await page.evaluate(() => {
        Object.defineProperty(Object.getPrototypeOf(screen.orientation), 'lock', {configurable: true, value: async (value) => { window.requestedOrientation = value; }});
      });
      await page.getByRole('button', {name: 'Fullscreen', exact: true}).click();
      assert.equal(await page.evaluate(() => window.requestedOrientation), 'landscape');
      assert(await page.locator('.immersive-editor').evaluate((e) => e.classList.contains('expanded')));
      await page.getByRole('button', {name: 'Exit fullscreen', exact: true}).click();
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await page.setViewportSize({width: 852, height: 393});
      await page.waitForTimeout(300);
      const frame = await page.locator('.immersive-editor').boundingBox();
      assert(Math.abs(frame.height - 393) < 2, 'landscape phone uses screen height');
      const video = await page.locator('.editor-video').boundingBox();
      assert(Math.abs(video.width / video.height - 16 / 9) < 0.02, 'landscape preserves full composition');
      assert(video.width >= 680, 'landscape fills available height');
      await page.screenshot({path: `/tmp/voodoo-landscape-${name}.png`, scale: 'css'});
    }
    await page.getByRole('button', {name: 'Edit Headline', exact: true}).first().click();
    const input = page.getByRole('textbox', {name: 'Headline', exact: true});
    await input.fill('');
    assert(await page.getByRole('button', {name: 'Save text', exact: true}).isDisabled());
    await input.fill('W'.repeat(25));
    assert(await page.getByRole('button', {name: 'Save text', exact: true}).isDisabled());
    await input.fill('Draft to cancel');
    await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('voodoo:v2:drop-sale')).texts.headline), 'The drop is here');
    await page.getByRole('button', {name: 'Edit Headline', exact: true}).first().click();
    await input.fill("Let's go");
    await input.press('Enter');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('voodoo:v2:drop-sale')).texts.headline), "Let's go");
    // Text remains selectable during playback; click an actual glyph, not a paused hit target.
    await page.getByRole('button', {name: 'Play', exact: true}).click();
    await page.waitForTimeout(100);
    const point = await page.locator('.editor-video [data-text-role="headline"]').first().evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      walker.nextNode();
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      const rect = range.getBoundingClientRect();
      return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
    });
    await page.mouse.click(point.x, point.y);
    await input.waitFor();
    await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
    assert(await page.getByRole('button', {name: 'Play', exact: true}).isVisible());
    await (await menuAction(page, 'Share to socials')).click();
    await page.getByRole('dialog', {name: 'Share video'}).waitFor({state: 'visible'});
    await page.getByRole('button', {name: 'Close share', exact: true}).click();
    await openPanel(page, 'Theme');
    await page.getByRole('textbox', {name: 'Background hex', exact: true}).fill('#123456');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('voodoo:v2:drop-sale')).theme.background), '#123456');
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    assert.notEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('voodoo:v2:drop-sale')).theme.background), '#123456');
    if (mobile) {
      await page.setViewportSize({width: 393, height: 659});
      await page.goto(base + '#/v/glass-app');
      await page.getByRole('button', {name: 'Pause', exact: true}).click();
      await page.locator('.scene').first().click();
      await page.waitForTimeout(250);
      await page.screenshot({path: `/tmp/voodoo-portrait-${name}.png`, scale: 'css'});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      // Overriding visualViewport while text is selected crashes the macOS WebKit
      // runner in native NSTextInputContext. Exercise the synthetic resize in Chromium.
      if (engine === chromium) {
        await page.getByRole('button', {name: 'Edit Headline', exact: true}).first().click();
        await page.evaluate(() => {
          Object.defineProperty(visualViewport, 'height', {configurable: true, value: 320});
          visualViewport.dispatchEvent(new Event('resize'));
        });
        await page.waitForTimeout(150);
        const edit = await page.locator('.inline-editor').boundingBox();
        assert(edit.y >= 0 && edit.y + edit.height <= 322, 'inline field remains above simulated keyboard');
        await page.getByRole('button', {name: 'Cancel edit', exact: true}).click();
        await page.evaluate(() => {
          delete visualViewport.height;
          visualViewport.dispatchEvent(new Event('resize'));
        });
      }
    }
    await page.evaluate(() => {
      localStorage.setItem('voodoo:v2:flex-drop', JSON.stringify({
        texts: {brand: 'Shared', headline: 'Shared', point1: 'Shared', point2: 'Shared', point3: 'Shared', cta: 'Shared'},
        theme: {background: '#000000', surface: '#111111', foreground: '#ffffff', accent: '#ff0000', accent2: '#00ff00'},
      }));
    });
    await page.goto(base + '#/v/flex-drop');
    await page.getByRole('button', {name: 'Pause', exact: true}).click();
    await page.locator('.scene').nth(1).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', {name: 'Edit Point 2', exact: true}).click();
    await page.getByRole('textbox', {name: 'Point 2', exact: true}).fill('Only this one');
    await page.getByRole('button', {name: 'Save text', exact: true}).click();
    const texts = await page.evaluate(() => JSON.parse(localStorage.getItem('voodoo:v2:flex-drop')).texts);
    assert.equal(texts.point1, 'Shared');
    assert.equal(texts.point2, 'Only this one');
    assert.equal(texts.point3, 'Shared');
    assert.deepEqual(errors, []);
    console.log(`${name}: layout, fullscreen fallback, live click, validation, cancel, save, share, theme undo, duplicate text roles passed`);
  } finally { await browser.close(); }
}

(async () => {
  const ios = process.argv.includes('--ios');
  const mobile = process.argv.includes('--mobile');
  await check(ios ? webkit : chromium, ios || mobile ? {...devices['iPhone 15 Pro']} : {viewport: {width: 1440, height: 1000}}, ios ? 'ios' : mobile ? 'mobile-chromium' : 'desktop');
})().catch((e) => { console.error(e); process.exitCode = 1; });
