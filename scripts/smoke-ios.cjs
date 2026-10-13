// WebKit + iPhone emulation: scroll the gallery, open the editor, check for errors.
const {webkit, devices} = require('playwright');

(async () => {
  const base = process.env.URL || 'http://localhost:5180/voodoo/';
  const browser = await webkit.launch();
  const ctx = await browser.newContext({...devices['iPhone 15 Pro']});
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('crash', () => errs.push('PAGE CRASHED'));
  await page.goto(base);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(150);
  }
  const imgs = await page.locator('.media img').evaluateAll((els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
  const players = await page.locator('.media .__remotion-player').count();
  await page.screenshot({path: '/tmp/voodoo-ios-gallery.png', scale: 'css'});

  // Brand colors render static Remotion frames only for on-screen cards.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.brand-strip .palette-btn[aria-label="Sorbet"]').tap();
  await page.waitForTimeout(1200);
  const kitPlayers = await page.locator('.card .media .__remotion-player').count();
  const kitBg = await page.locator('.card .media').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator('.brand-customize').tap();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({path: '/tmp/voodoo-ios-strip.png', scale: 'css'});
  await page.locator('.brand-customize').tap();
  for (let i = 0; i < 16; i++) {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(200);
  }
  await page.screenshot({path: '/tmp/voodoo-ios-kit.png', scale: 'css'});

  // An untouched video opens in the brand colors; Reset restores the preset.
  await page.goto(base + '#/v/stack-kicklab');
  await page.waitForTimeout(2000);
  await page.getByRole('button', {name: 'Theme', exact: true}).tap();
  const editorBg = await page.getByLabel('Background hex').inputValue();
  // On phones the open panel covers the rail, so close it before Reset.
  await page.getByRole('button', {name: 'Close panel', exact: true}).tap();
  await page.getByRole('button', {name: 'Reset to original', exact: true}).tap();
  await page.getByRole('button', {name: 'Theme', exact: true}).tap();
  await page.waitForTimeout(300);
  const resetBg = await page.getByLabel('Background hex').inputValue();

  // Turning the kit off brings back the original previews.
  await page.goto(base);
  await page.waitForTimeout(1200);
  await page.getByRole('switch', {name: 'Brand colors'}).tap();
  await page.waitForTimeout(800);
  const offPlayers = await page.locator('.card .media .__remotion-player').count();
  const kit = {kitPlayers, kitBg, overflow, editorBg, resetBg, offPlayers};
  const kitOk = kitPlayers > 0 && kitBg === 'rgb(255, 241, 242)' && overflow <= 0 && editorBg === '#fff1f2' && resetBg === '#111111' && offPlayers === 0;

  await page.goto(base + '#/v/neon-summit');
  await page.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(150);
  }
  await page.screenshot({path: '/tmp/voodoo-ios-editor.png', scale: 'css'});
  console.log(JSON.stringify({imgsLoaded: imgs, livePlayersInGrid: players, kit, errs}));
  await browser.close();
  if (errs.length || !imgs || players !== 0 || !kitOk) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
