import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {HttpError, validateShare} from './model.ts';
import {checkSvg, logoBytes, processLogo} from './logos.ts';
import {checkBrand, tailorProps} from './tailor.ts';
import {bindHyperframes} from '../src/videos/hyperframes.ts';
import {applyKit} from '../src/ui/brandKit.ts';
import {schemas} from '../src/videos/schemas.ts';
import {supportsLogo} from '../src/videos/logo.ts';
import {templateMeta} from '../src/videos/meta.ts';

const id = 'a'.repeat(64);
const logo = {id, ratio: 3.2, mono: true};
const launch = manifest.variants.find((v) => v.id === 'changelog-launch')!;
const remotion = manifest.variants.find((v) => v.id === 'showreel-nocturne')!;
let hasFfmpeg = true;
try { execFileSync('ffmpeg', ['-version'], {stdio: 'ignore'}); } catch { hasFfmpeg = false; }
// The composition as the share server builds it (server/hyperframes.ts).
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const changelogHtml = read('src/hyperframes/changelog/index.html').replace('__BASE_CSS__', read('src/hyperframes/shared/base.css'))
  .replace('__BASE_JS__', read('src/hyperframes/shared/base.js')).replace('__BEAT_JS__', () => read('src/hyperframes/shared/beat.js'));

test('logo slots exist on every library template and nowhere else', () => {
  const slotted = Object.keys(schemas).filter((t) => supportsLogo(schemas[t]));
  assert.equal(slotted.length, 40);
  assert.ok(!supportsLogo(schemas.showreel));
});

test('a logo is optional, validated, and kept in canonical form', () => {
  assert.doesNotThrow(() => validateShare({variantId: launch.id, props: launch.props}), 'props without a logo still validate');
  const value = validateShare({variantId: launch.id, props: {...launch.props, logo: {mono: true, ratio: 3.2, id}}});
  assert.deepEqual(Object.keys((value.props as unknown as {logo: object}).logo), ['id', 'ratio', 'mono']);
  for (const bad of [{id: 'x', ratio: 3, mono: true}, {id, ratio: 20, mono: true}, {id, ratio: 3}, {id, ratio: 3, mono: true, url: 'https://evil.test/x.png'}, null]) {
    assert.throws(() => validateShare({variantId: launch.id, props: {...launch.props, logo: bad}}), HttpError, JSON.stringify(bad));
  }
  assert.throws(() => validateShare({variantId: remotion.id, props: {...remotion.props, logo}}), HttpError, 'templates without a slot reject a logo');
});

test('the logo hook is added only to documents with a logo', () => {
  const meta = templateMeta.changelog;
  const plain = bindHyperframes({html: changelogHtml, meta, props: launch.props as never, assetBase: 'assets', logoSrc: (x) => `/l/${x}.png`});
  assert.equal(plain, bindHyperframes({html: changelogHtml, meta, props: launch.props as never, assetBase: 'assets'}), 'without a logo the document is unchanged');
  const bound = bindHyperframes({html: changelogHtml, meta, props: {...launch.props, logo} as never, assetBase: 'assets', logoSrc: (x) => `/l/${x}.png`});
  assert.match(bound, /window\.__cliphouseLogo=\{"id":"a{64}","ratio":3\.2,"mono":true,"src":"\/l\/a{64}\.png","alt":"Relay"\}/);
  assert.ok(bound.indexOf('__logoWrapped') > bound.indexOf('beat_entry_exports'), 'the hook runs after the beat runtime');
  assert.ok(bound.indexOf('__logoWrapped') < bound.indexOf('CliphouseBeat.mount(tl'), 'and before the template mounts');
  assert.throws(() => bindHyperframes({html: changelogHtml, meta, props: {...launch.props, logo} as never, assetBase: 'assets'}), /logo source/);
});

test('tailoring and the brand kit add a logo only where a template has a slot', () => {
  const brand = checkBrand({name: 'Acme', logo});
  assert.deepEqual((tailorProps(launch.id, brand).props as {logo?: unknown}).logo, logo);
  assert.equal((tailorProps(remotion.id, brand).props as {logo?: unknown}).logo, undefined);
  assert.throws(() => checkBrand({name: 'Acme', logo: {id: 'nope', ratio: 1}}), HttpError);
  const kit = {enabled: false, theme: null, logo};
  assert.deepEqual((applyKit(launch.props as never, kit, true) as {logo?: unknown}).logo, logo);
  assert.equal(applyKit(remotion.props as never, kit, false), remotion.props, 'a logo-only kit leaves other templates as they are');
});

test('SVG logos with scripts, entities, or outside references are refused', () => {
  assert.doesNotThrow(() => checkSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="a"/></defs><use href="#a"/></svg>'));
  for (const svg of [
    '<svg><script>alert(1)</script></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
    '<svg><image href="https://evil.test/x.png"/></svg>',
    '<svg><image xlink:href="file:///etc/passwd"/></svg>',
    '<svg><foreignObject><div/></foreignObject></svg>',
    '<svg><rect style="fill:url(https://evil.test/x)"/></svg>',
  ]) assert.throws(() => checkSvg(svg), HttpError, svg);
  assert.throws(() => logoBytes({data: 'not base64!'}), HttpError);
  assert.equal(logoBytes({data: `data:image/png;base64,${Buffer.from('hi').toString('base64')}`}).toString(), 'hi');
});

test('raster logos become a hashed PNG with their ratio and transparency', {skip: !hasFfmpeg}, async () => {
  const png = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black@0.0:s=300x100,format=rgba,drawbox=x=20:y=20:w=100:h=60:color=white@1:t=fill',
    '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1']);
  const out = await processLogo(png);
  assert.match(out.id, /^[a-f0-9]{64}$/);
  assert.equal(out.ratio, 3);
  assert.equal(out.transparent, true);
  assert.equal((await processLogo(png)).id, out.id, 'the id is stable for the same file');
  await assert.rejects(processLogo(Buffer.from('GIF89a....')), (e: HttpError) => e.status === 415);
  await assert.rejects(processLogo(Buffer.alloc(1_100_000, 1)), (e: HttpError) => e.status === 413);
});
