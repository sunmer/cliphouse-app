// Sound on, then sample the audio monitor for drift: node scripts/poc/frames-probe.cjs <variant>
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const p = await (await b.newContext({viewport: {width: 1440, height: 900}})).newPage();
  await p.goto(`http://localhost:5190/#/v/${process.argv[2]}`);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(3000);
  await p.click('button[aria-label="Play sound"]');
  for (let k = 0; k < 6; k++) { await p.waitForTimeout(700); console.log(JSON.stringify(await p.evaluate(() => window.__cliphouseAudio?.()))); }
  await b.close();
})();
