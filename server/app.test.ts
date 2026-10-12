import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {createHandler} from './app.ts';
import {HttpError, byteRange, exportFilename, fingerprint, shareHtml, validateShare, type Exported, type Published} from './model.ts';
import type {createStore} from './store.ts';

// A silent showreel preset: these tests use the plain texts + theme contract.
const variant = manifest.variants.find((v) => v.id === 'showreel-nocturne')!;
const props = structuredClone(variant.props);
props.texts.headline = 'MY SHARED EDIT';
const payload = {variantId: variant.id, props};
const id = 'abcdefghijklmnopqrstuvwxyz123456';
const data: Published = {...validateShare(payload), id, owner: 'alice', status: 'ready', createdAt: 1};
const saved = new Map<string, Published>([[id, data]]);
const completed = new Map<string, Published>();
const exported = new Map<string, Exported>();
const completedExports = new Map<string, Exported>();
let renders = 0;
let videoRenders = 0;
let failRender = false;
const bytes = Buffer.from('0123456789');
const store = {
  async reserve(owner: string, key: string, value: ReturnType<typeof validateShare>) {
    if (completed.has(key)) return {ready: completed.get(key)};
    return {video: {...value, id, owner, status: 'rendering', createdAt: 1}};
  },
  async finish(key: string, value: Published) { const ready = {...value, status: 'ready'}; completed.set(key, ready); saved.set(id, ready); return ready; },
  async fail() {},
  async get(key: string) { if (!saved.has(key)) throw new HttpError(404, 'This shared video is unavailable.'); return saved.get(key)!; },
  async remove(key: string, uid: string) { const item = await this.get(key); if (item.owner !== uid) throw new HttpError(403, 'Not your video.'); saved.delete(key); },
  async asset() { return {size: bytes.length, stream: (range?: {start: number; end: number}) => Readable.from(range ? bytes.subarray(range.start, range.end + 1) : bytes)}; },
  async reserveExport(owner: string, key: string, value: ReturnType<typeof validateShare>) {
    if (completedExports.has(key)) return {ready: completedExports.get(key)};
    return {video: {id: exportId, owner, variantId: value.variantId, template: value.template, title: value.title, status: 'rendering', createdAt: 1}};
  },
  async finishExport(key: string, value: Exported) { const ready = {...value, status: 'ready'}; completedExports.set(key, ready); exported.set(ready.id, ready); return ready; },
  async failExport() {},
  async getExport(key: string) { if (!exported.has(key)) throw new HttpError(404, 'This MP4 is unavailable.'); return exported.get(key)!; },
  async exportAsset() { return {size: bytes.length, stream: (range?: {start: number; end: number}) => Readable.from(range ? bytes.subarray(range.start, range.end + 1) : bytes)}; },
} as ReturnType<typeof createStore>;
const server = createServer(createHandler({
  store, origin: 'https://cliphou.se', origins: new Set(['https://cliphou.se']), version: 'test',
  assets: {file: 'assets/test.js', css: ['assets/test.css']},
  verify: async (token) => {
    if (token === 'expired') throw new Error('expired');
    return {uid: token, email_verified: token !== 'unverified', firebase: {sign_in_provider: token === 'anonymous' ? 'anonymous' : 'google.com'}};
  },
  render: async () => {
    renders++;
    if (failRender) throw new Error('render failed');
    return {image: '/tmp/test.jpg', cleanup: async () => {}};
  },
  renderVideo: async () => { videoRenders++; return {video: '/tmp/test.mp4', cleanup: async () => {}}; },
}));
const exportId = 'mp4mp4mp4mp4mp4mp4mp4mp4mp4mp4mp4';
let origin: string;
before(async () => { await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${(server.address() as {port: number}).port}`; });
after(() => new Promise<void>((resolve) => server.close(() => resolve())));
const post = (body: unknown, token = 'alice', headers = {}) => fetch(`${origin}/api/shares`, {method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers}, body: JSON.stringify(body)});
const postExport = (body: unknown, token = 'alice') => fetch(`${origin}/api/exports`, {method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify(body)});

test('all presets validate, unknown fields and active-content colors do not', () => {
  for (const v of manifest.variants) assert.doesNotThrow(() => validateShare({variantId: v.id, props: v.props}));
  for (const input of [
    {...payload, owner: 'bob'}, {...payload, variantId: '../private'},
    {...payload, props: {...props, theme: {...props.theme, accent: 'url(https://evil.test)'}}},
    {...payload, props: {...props, texts: {...props.texts, headline: 'x'.repeat(25)}}},
    {...payload, props: {...props, texts: {...props.texts, headline: '   '}}},
  ]) assert.throws(() => validateShare(input), HttpError);
});
test('image presets validate only the template\'s own image IDs', () => {
  const photo = manifest.variants.find((v) => 'media' in v.props)!;
  const base = photo.props as typeof photo.props & {media: Record<string, string>};
  assert.deepEqual((validateShare({variantId: photo.id, props: {...base, media: {background: 'city'}}}).props as {media?: unknown}).media, {background: 'city'});
  for (const media of [{background: 'https://evil.test/x.jpg'}, {background: 'toString'}, {background: 'lake'}, {}, {background: 'coast', extra: 'coast'}, undefined]) {
    assert.throws(() => validateShare({variantId: photo.id, props: {...base, media}}), HttpError);
  }
  assert.throws(() => validateShare({...payload, props: {...props, media: {background: 'coast'}}}), HttpError);
});
test('fingerprints distinguish users and edits but not input property order', () => {
  const a = validateShare(payload);
  const reordered = validateShare({...payload, props: {theme: props.theme, texts: Object.fromEntries(Object.entries(props.texts).reverse())}});
  assert.equal(fingerprint('alice', a, '1'), fingerprint('alice', reordered, '1'));
  assert.notEqual(fingerprint('alice', a, '1'), fingerprint('bob', a, '1'));
  assert.notEqual(fingerprint('alice', a, '1'), fingerprint('alice', a, '2'));
  const changed = validateShare({...payload, props: {...props, theme: {...props.theme, background: '#123456'}}});
  assert.notEqual(fingerprint('alice', a, '1'), fingerprint('alice', changed, '1'));
});
test('publishing checks tokens, Google identity, origin, body size and schema before rendering', async () => {
  assert.equal((await fetch(`${origin}/api/shares`, {method: 'POST'})).status, 401);
  for (const token of ['expired', 'anonymous', 'unverified']) assert.ok([401, 403].includes((await post(payload, token)).status));
  assert.equal((await post(payload, 'alice', {Origin: 'https://evil.test'})).status, 403);
  assert.equal((await post({...payload, props: {}})).status, 400);
  assert.equal((await post({x: 'x'.repeat(17_000)})).status, 413);
  assert.equal(renders, 0);
});
test('a signed-in edit publishes once and retries reuse its link', async () => {
  const first = await post(payload);
  assert.equal(first.status, 201);
  const body = await first.json();
  assert.deepEqual(body.props, props);
  assert.equal(body.url, `https://cliphou.se/s/${id}`);
  assert.equal('owner' in body, false);
  assert.equal((await post(payload)).status, 200);
  assert.equal(renders, 1);
});
test('anonymous crawlers get edit-specific metadata without JavaScript or authentication', async () => {
  const response = await fetch(`${origin}/s/${id}`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /og:title" content="MY SHARED EDIT"/);
  assert.ok(!html.includes('og:video'));
  assert.ok(!html.includes('.mp4'));
  assert.match(html, new RegExp(`og:image" content="https://cliphou.se/s/${id}/preview.jpg"`));
  assert.ok(!html.includes('alice'));
  const fetched = await (await fetch(`${origin}/api/shares/${id}`)).json();
  assert.deepEqual(fetched.props, props);
  assert.equal(fetched.owner, undefined);
  assert.equal(fetched.video, undefined);
  assert.equal((await fetch(`${origin}/s/${id}/video.mp4`)).status, 404);
  assert.equal((await fetch(`${origin}/s/${'z'.repeat(32)}`)).status, 404);
});
test('shares publish a crawlable agent spec pinned to their template version', async () => {
  const response = await fetch(`${origin}/s/${id}/agent.json`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const spec = await response.json();
  assert.equal(spec.kind, 'share');
  assert.equal(spec.templateVersion, data.templateVersion);
  assert.deepEqual(spec.props, props);
  assert.equal(spec.source.package, `https://cliphou.se/source/${variant.template}/v${data.templateVersion}.tar.gz`);
  assert.match(spec.handoff.example, new RegExp(`^https://cliphou.se/#/v/${variant.id}\\?props=`));
  assert.equal(spec.jsonSchema.properties.texts.additionalProperties, false);
  assert.ok(!JSON.stringify(spec).includes('alice'));
  // Shares saved before versioning stay on v1.
  saved.set('legacylegacylegacylegacy1', {...data, id: 'legacylegacylegacylegacy1', templateVersion: undefined});
  assert.equal((await (await fetch(`${origin}/s/legacylegacylegacylegacy1/agent.json`)).json()).templateVersion, 1);
  const html = await (await fetch(`${origin}/s/${id}`)).text();
  assert.match(html, new RegExp(`rel="alternate" type="application/json" href="https://cliphou.se/s/${id}/agent.json"`));
});
test('share validation pins and checks template versions', () => {
  assert.equal(validateShare(payload).templateVersion, data.templateVersion);
  // v1 renders with the current code only while it is the latest version.
  assert.equal(validateShare({...payload, templateVersion: 1}).composition, data.templateVersion === 1 ? variant.template : `${variant.template}-v1`);
  for (const templateVersion of [0, 99, '1', 1.5, null]) assert.throws(() => validateShare({...payload, templateVersion}), HttpError);
  const a = validateShare(payload);
  assert.notEqual(fingerprint('alice', a, '1'), fingerprint('alice', {...a, templateVersion: a.templateVersion + 1}, '1'));
});
test('untrusted copy cannot escape metadata or introduce scripts', () => {
  const html = shareHtml({...data, title: '\"><script>alert(1)</script>'}, 'https://cliphou.se', {file: 'assets/a.js'});
  assert.ok(!html.includes('<script>alert'));
  assert.match(html, /&lt;script&gt;/);
});
test('thumbnail delivery supports HEAD, full files and byte ranges', async () => {
  const url = `${origin}/s/${id}/preview.jpg`;
  const head = await fetch(url, {method: 'HEAD'});
  assert.equal(head.headers.get('content-type'), 'image/jpeg');
  assert.equal(head.headers.get('content-length'), '10');
  assert.equal(await head.text(), '');
  assert.equal(await (await fetch(url)).text(), '0123456789');
  const range = await fetch(url, {headers: {Range: 'bytes=0-1'}});
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), 'bytes 0-1/10');
  assert.equal(await range.text(), '01');
  assert.equal((await fetch(url, {headers: {Range: 'bytes=99-100'}})).status, 416);
  assert.deepEqual(byteRange('bytes=-3', 10), {start: 7, end: 9});
  assert.deepEqual(byteRange('bytes=2-', 10), {start: 2, end: 9});
  for (const invalid of ['bytes=-', 'bytes=-0', 'bytes=3-2', 'bytes=0-1,3-4']) assert.throws(() => byteRange(invalid, 10), HttpError);
});
test('render failures return an actionable error and release the renderer', async () => {
  failRender = true;
  const response = await post(payload, 'charlie');
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /edits are safe/);
  failRender = false;
  assert.equal((await post(payload, 'charlie')).status, 201);
});
test('only the owner can remove a published link', async () => {
  assert.equal((await fetch(`${origin}/api/shares/${id}`, {method: 'DELETE', headers: {Authorization: 'Bearer bob'}})).status, 403);
  assert.equal((await fetch(`${origin}/api/shares/${id}`, {method: 'DELETE', headers: {Authorization: 'Bearer charlie'}})).status, 200);
  assert.equal((await fetch(`${origin}/s/${id}`)).status, 404);
});
test('MP4 export validates identity and props, reuses identical renders, and downloads as an attachment', async () => {
  assert.equal((await fetch(`${origin}/api/exports`, {method: 'POST'})).status, 401);
  assert.equal((await postExport(payload, 'anonymous')).status, 403);
  assert.equal((await postExport({...payload, props: {...props, texts: {...props.texts, headline: 'x'.repeat(25)}}})).status, 400);
  assert.equal(videoRenders, 0);
  const first = await postExport(payload);
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), {id: exportId, path: `/api/exports/${exportId}/video.mp4`, filename: 'my-shared-edit.mp4'});
  assert.equal((await postExport(payload)).status, 200);
  assert.equal(videoRenders, 1);
  const download = await fetch(`${origin}/api/exports/${exportId}/video.mp4`);
  assert.equal(download.headers.get('content-type'), 'video/mp4');
  assert.equal(download.headers.get('content-disposition'), 'attachment; filename="my-shared-edit.mp4"');
  assert.equal(await download.text(), '0123456789');
  assert.equal((await fetch(`${origin}/api/exports/${exportId}/video.mp4`, {headers: {Range: 'bytes=2-3'}})).status, 206);
  assert.equal((await fetch(`${origin}/api/exports/${'z'.repeat(32)}/video.mp4`)).status, 404);
  assert.equal(exportFilename({variantId: 'fallback', title: '!!!'}), 'fallback.mp4');
});
