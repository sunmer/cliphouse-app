const assert = require('node:assert/strict');
const {chromium, webkit, devices} = require('playwright');
const manifest = require('../src/catalog/manifest.json');
const base = process.env.URL || 'http://localhost:5180/voodoo/';

async function clickText(page, label, optional = false) {
  const point = await page.locator('.text-hit').evaluateAll((els, label) => {
    for (const el of els.filter((el) => el.ariaLabel === label)) {
      const r = el.getBoundingClientRect();
      for (const x of [0.5, 0.25, 0.75]) for (const y of [0.5, 0.25, 0.75]) {
        const px = r.left + r.width * x, py = r.top + r.height * y;
        if (document.elementFromPoint(px, py)?.getAttribute('aria-label') === label) return {x: px, y: py};
      }
    }
  }, label);
  if (!point && optional) return false;
  assert(point, `No clickable text for ${label}`);
  await page.mouse.click(point.x, point.y);
  return true;
}

(async () => {
  const ios = process.argv.includes('--ios');
  const browser = await (ios ? webkit : chromium).launch();
  const ctx = await browser.newContext(ios ? {...devices['iPhone 15 Pro']} : {viewport: {width: 1440, height: 1000}});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const {templateMeta} = await import('../src/videos/meta.ts');
    const {ROLES, roleExample} = await import('../src/videos/vocab.ts');
    for (const template of manifest.templates) {
      if (process.env.TEMPLATE && template.id !== process.env.TEMPLATE) continue;
      const v = manifest.variants.find((v) => v.template === template.id && !v.hidden);
      const meta = templateMeta[template.id];
      await page.goto(base + '#/v/' + v.id);
      await page.getByRole('heading', {name: v.title, exact: true}).waitFor();
      await page.getByRole('button', {name: 'Pause', exact: true}).click();
      assert.equal(await page.locator('.desc, .prompt, .related, .panel, .field').count(), 0);
      const seen = new Set();
      for (let i = 0; i < meta.scenes.filter((s) => s.type !== 'transition').length; i++) {
        const expected = meta.scenes.filter((s) => s.type !== 'transition')[i].roles.map((role) => `Edit ${ROLES[role].label}`);
        await page.locator('.scene').nth(i).click();
        await page.waitForFunction((labels) => labels.every((label) => [...document.querySelectorAll('.text-hit')].some((el) => el.getAttribute('aria-label') === label)), expected, {timeout: 3000}).catch(() => {});
        const labels = [...new Set([...expected, ...await page.locator('.text-hit').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))])];
        for (const label of labels) {
          if (seen.has(label)) continue;
          await page.waitForTimeout(80);
          if (!await clickText(page, label, true)) { console.log(`${v.id}: could not click ${label}`); continue; }
          const role = Object.keys(v.props.texts).find((role) => `Edit ${ROLES[role].label}` === label);
          assert(role, `Unknown role ${label}`);
          const field = page.getByRole('textbox', {name: ROLES[role].label, exact: true});
          assert.equal(await field.inputValue(), v.props.texts[role]);
          // Structured roles (price, stat, list, chart) need a value in their format.
          const value = roleExample(role) ?? `Edit ${role}`;
          await field.fill(value);
          await page.getByRole('button', {name: 'Save text', exact: true}).click();
          assert.equal(await page.evaluate(({id, role}) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)).texts[role], {id: v.id, role}), value);
          await page.getByRole('button', {name: 'Undo', exact: true}).click();
          await page.waitForTimeout(60);
          seen.add(label);
        }
      }
      for (const role of Object.keys(v.props.texts)) assert(seen.has(`Edit ${ROLES[role].label}`), `${v.id}: missing inline target ${role}`);
      // The main text role: headline when present, otherwise the first role (quote templates have none).
      const main = 'headline' in v.props.texts ? 'headline' : Object.keys(v.props.texts)[0];
      const sceneIndex = meta.scenes.filter((s) => s.type !== 'transition').findIndex((s) => s.roles.includes(main));
      await page.locator('.scene').nth(sceneIndex).click();
      await page.waitForTimeout(200);
      await clickText(page, `Edit ${ROLES[main].label}`);
      const input = page.getByRole('textbox', {name: ROLES[main].label, exact: true});
      assert.equal(await input.inputValue(), v.props.texts[main]);
      assert(await input.evaluate((el) => document.activeElement === el));
      await input.fill('Made for motion');
      await page.screenshot({path: `/tmp/voodoo-inline-${template.id}-${ios ? 'ios' : 'desktop'}.png`, scale: 'css'});
      await page.getByRole('button', {name: 'Save text', exact: true}).click();
      assert.equal(await page.evaluate(({id, main}) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)).texts[main], {id: v.id, main}), 'Made for motion');
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      assert.equal(await page.evaluate(({id, main}) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)).texts[main], {id: v.id, main}), v.props.texts[main]);
      await page.getByRole('button', {name: 'Redo', exact: true}).click();
      await page.reload();
      await page.getByRole('button', {name: 'Pause', exact: true}).click();
      assert.equal(await page.evaluate(({id, main}) => JSON.parse(localStorage.getItem(`voodoo:v2:${id}`)).texts[main], {id: v.id, main}), 'Made for motion');
      const width = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      assert(width, `${v.id}: horizontal overflow`);
      if (!ios) {
        assert.equal(await page.getByRole('button', {name: 'Fullscreen', exact: true}).isVisible(), false);
        const box = await page.locator('.immersive-editor').boundingBox();
        assert(box.width <= 1200 && box.height < 900, 'desktop remains contained');
      }
      console.log(`${ios ? 'ios' : 'desktop'}: ${v.id}, ${Object.keys(v.props.texts).length} roles, edit/undo/redo/persist passed`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
