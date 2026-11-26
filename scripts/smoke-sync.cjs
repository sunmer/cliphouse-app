const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.URL || 'http://127.0.0.1:5182/voodoo/';
const alice = `alice-${Date.now()}@example.test`;
const bob = `bob-${Date.now()}@example.test`;

async function login(page, email) {
  const event = page.waitForEvent('popup');
  await page.getByRole('button', {name: 'Sign in with Google', exact: true}).click();
  const popup = await event;
  await popup.getByText('Sign-in with Google.com', {exact: true}).waitFor();
  const existing = popup.getByText(email, {exact: true});
  if (await existing.count()) {
    await existing.click();
  } else {
    await popup.getByText('Add new account', {exact: true}).click();
    await popup.locator('#email-input').fill(email);
    await popup.locator('#display-name-input').fill('Test account');
    await popup.getByRole('button', {name: 'Sign in with Google.com', exact: true}).click();
  }
  await page.getByRole('dialog').waitFor({state: 'hidden'});
  await page.getByRole('button', {name: 'Your account', exact: true}).waitFor();
}
async function logout(page) {
  await page.getByRole('button', {name: 'Your account', exact: true}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await page.getByRole('dialog').waitFor({state: 'hidden'});
}

(async () => {
  const browser = await chromium.launch();
  let page;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    const star = page.locator('.card-star').first();
    await star.click();
    await login(page, alice);
    await page.waitForFunction(() => document.querySelector('.card-star')?.getAttribute('aria-pressed') === 'true' && document.querySelector('.card-star')?.getAttribute('aria-busy') === 'false');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.card-star')?.getAttribute('aria-pressed') === 'true');
    const starredCount = () => page.locator('.card-star[aria-pressed="true"]').count();
    assert.equal(await starredCount(), 1);
    await logout(page);
    assert.equal(await starredCount(), 0, 'signout clears private stars');
    await page.getByRole('button', {name: /^Sign in$/}).first().click();
    await login(page, bob);
    assert.equal(await starredCount(), 0, 'another account cannot see Alice stars');
    await logout(page);
    await page.getByRole('button', {name: /^Sign in$/}).first().click();
    await login(page, alice);
    await page.waitForFunction(() => document.querySelectorAll('.card-star[aria-pressed="true"]').length === 1);
    await page.locator('.card-star[aria-pressed="true"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.card-star[aria-pressed="true"]').length === 0 && document.querySelector('.card-star[aria-busy="true"]') === null);
    await page.reload();
    await page.locator('.card-star').first().waitFor();
    await page.waitForTimeout(1500);
    assert.equal(await starredCount(), 0, 'unstar persists');
    assert.deepEqual(errors, []);
    console.log('Google emulator popup, first-click star, reload, sign-out, account isolation, and unstar persistence passed.');
    await context.close();
  } catch (error) {
    console.error(await page?.locator('body').innerText());
    await page?.screenshot({path: '/tmp/cliphouse-sync-failure.png', scale: 'css'});
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
