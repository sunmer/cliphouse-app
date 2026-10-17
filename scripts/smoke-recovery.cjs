const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const base = process.env.URL || 'http://127.0.0.1:5183/';

async function check(engine, viewport, name) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}benchmark/`, {waitUntil: 'networkidle'});
    const baseline = await (await page.request.get(`${base}benchmark/results.json`)).json();
    const repairs = await (await page.request.get(`${base}benchmark/recovery.json`)).json();
    const protocol = await (await page.request.get(`${base}benchmark/protocol.json`)).json();
    const additionsA1 = await (await page.request.get(`${base}benchmark/addition-results.json`)).json();
    const additionsA2 = await (await page.request.get(`${base}benchmark/addition-a2-results.json`)).json();
    const additionsA3 = await (await page.request.get(`${base}benchmark/addition-a3-results.json`)).json();
    const repairsA3 = await (await page.request.get(`${base}benchmark/addition-a3-recovery.json`)).json();
    const additions = {entries: [...additionsA1.entries, ...additionsA2.entries, ...additionsA3.entries]};
    const additionRepairs = repairsA3.entries;
    assert.equal(repairs.entries.length, baseline.entries.filter(entry => entry.status === 'failed').length);
    assert.equal(await page.locator('.benchmark-recovery-summary, .benchmark-progress').count(), 0);
    const originalLink = await page.getByRole('link', {name: 'Original results', exact: true}).getAttribute('href');
    assert.deepEqual(await (await page.request.get(new URL(originalLink, base).href)).json(), baseline, 'original failures remain available unchanged');
    for (const brief of protocol.briefs) {
      await page.getByRole('button', {name: brief.name, exact: true}).click();
      for (const run of [1, 2]) {
        await page.getByRole('button', {name: `Run ${run}`, exact: true}).click();
        const originals = baseline.entries.filter(entry => entry.brief === brief.id && entry.run === run);
        const recoveries = repairs.entries.filter(entry => entry.brief === brief.id && entry.run === run);
        const addedRepairs = additionRepairs.filter(entry => entry.brief === brief.id && entry.run === run);
        const added = additions.entries.filter(entry => entry.brief === brief.id && entry.run === run && (entry.status === 'rendered' || addedRepairs.some(item => item.model === entry.model && item.status === 'rendered')));
        assert.equal(await page.locator('.benchmark-card-media video').count(),
          originals.filter(entry => entry.status === 'rendered').length + recoveries.filter(entry => entry.status === 'rendered').length + added.length);
        assert.equal(await page.locator('.benchmark-recovery-label').count(), recoveries.length + addedRepairs.length);
        for (const repair of addedRepairs) {
          const card = page.locator('.benchmark-card').filter({has: page.getByRole('heading', {name: 'DeepSeek V4.1 Flash 1017', exact: true})});
          await card.locator('summary').click();
          assert.match(await card.innerText(), /Repair note/);
          assert.match(await card.innerText(), /Original outcome/);
          if (repair.video) assert.equal(await card.locator('video').getAttribute('data-video-src'), `/${repair.video}`);
          await card.locator('summary').click();
        }
        for (const original of originals) {
          const recovery = recoveries.find(entry => entry.model === original.model);
          const entry = recovery ? {...recovery, generationMs: original.generationMs + recovery.generationMs, renderMs: original.renderMs + recovery.renderMs} : original;
          const model = protocol.models.find(model => model.key === entry.model);
          const card = page.locator('.benchmark-card').filter({has: page.getByRole('heading', {name: model.name, exact: true})});
          const expected = entry.status === 'failed' ? 'No video' : `~${((entry.generationMs + entry.renderMs) / 1000).toFixed(1)}s`;
          assert.equal(await card.locator('.benchmark-metrics > div').filter({has: page.getByText('Time to video', {exact: true})}).locator('dd').textContent(), expected, `${model.name}: time includes every attempt`);
        }
        for (const recovery of recoveries) {
          const model = protocol.models.find(model => model.key === recovery.model);
          const card = page.locator('.benchmark-card').filter({has: page.getByRole('heading', {name: model.name, exact: true})});
          await card.locator('summary').click();
          assert.match(await card.innerText(), /Original outcome/);
          assert.match(await card.innerText(), /Additional repair cost/);
          const original = originals.find(entry => entry.model === recovery.model);
          assert.equal(await card.locator('.benchmark-metrics > div').filter({has: page.getByText('API cost', {exact: true})}).locator('dd').textContent(), `$${(original.costUsd + recovery.costUsd).toFixed(original.costUsd + recovery.costUsd < 0.01 ? 4 : 3)}`);
          if (recovery.video) assert.equal(await card.locator('video').getAttribute('data-video-src'), `/${recovery.video}`);
          await card.locator('summary').click();
        }
      }
    }
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.getByRole('button', {name: protocol.briefs.at(-1).name, exact: true}).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', {name: 'Run 2', exact: true}).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', {name: 'Product launch', exact: true}).click();
    await page.getByRole('button', {name: 'Run 1', exact: true}).click();
    const recoveredCard = page.locator('.benchmark-card').filter({has: page.locator('.benchmark-recovery-label')}).first();
    await recoveredCard.scrollIntoViewIfNeeded();
    const play = recoveredCard.getByRole('button', {name: /^Play /});
    if (await play.count()) {
      await play.click();
      await page.waitForFunction(() => [...document.querySelectorAll('video')].some(video => video.currentTime > 0.3 && video.dataset.videoSrc.includes('recovery-r1')));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path: `/tmp/cliphouse-recovery-${name}.png`});
    assert.deepEqual(errors, []);
    console.log(`${name}: all video timings, recovery costs, original records, source paths, URL state, and playback passed.`);
  } finally { await browser.close(); }
}
(async () => {
  await check(chromium, {width: 1440, height: 1000}, 'desktop');
  await check(webkit, {width: 390, height: 844}, 'mobile');
})().catch(error => {console.error(error); process.exitCode = 1;});
