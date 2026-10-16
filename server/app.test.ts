import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {createHandler} from './app.ts';
import {HttpError, byteRange, exportFilename, fingerprint, shareHtml, validateShare, type Exported, type Published} from './model.ts';
import {hashKey, type createStore} from './store.ts';
import {createLimiter} from './limits.ts';

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
  async remove(key: string, uid: string) { const item = await store.get(key); if (item.owner !== uid) throw new HttpError(403, 'Not your video.'); saved.delete(key); },
  async asset() { return {size: bytes.length, stream: (range?: {start: number; end: number}) => Readable.from(range ? bytes.subarray(range.start, range.end + 1) : bytes)}; },
  async reserveExport(owner: string, key: string, value: ReturnType<typeof validateShare>) {
    if (completedExports.has(key)) return {ready: completedExports.get(key)};
    return {video: {id: exportId, owner, variantId: value.variantId, template: value.template, title: value.title, status: 'rendering', createdAt: 1}};
  },
  async finishExport(key: string, value: Exported) { const ready = {...value, status: 'ready'}; completedExports.set(key, ready); exported.set(ready.id, ready); return ready; },
  async failExport() {},
  async getExport(key: string) { if (!exported.has(key)) throw new HttpError(404, 'This MP4 is unavailable.'); return exported.get(key)!; },
  async exportUrl(key: string, filename: string) { return `https://storage.test/exports/${key}/video.mp4?sig=1&name=${filename}`; },
  async createApiKey(owner: string) {
    const owned = [...apiKeys.values()].filter((k) => k.owner === owner && !k.revoked);
    if (owned.length >= 2) throw new HttpError(409, 'You can have 2 API keys. Revoke one first.');
    const key = `chk_${owner}${'x'.repeat(24)}${apiKeys.size}`;
    const info = {id: `key${owner}${apiKeys.size}000`, createdAt: 1, last4: key.slice(-4)};
    apiKeys.set(hashKey(key), {...info, owner, revoked: false});
    return {key, ...info};
  },
  async listApiKeys(owner: string) { return [...apiKeys.values()].filter((k) => k.owner === owner && !k.revoked).map(({id, createdAt, last4}) => ({id, createdAt, last4})); },
  async revokeApiKey(owner: string, id: string) {
    const entry = [...apiKeys.entries()].find(([, k]) => k.id === id && k.owner === owner && !k.revoked);
    if (!entry) throw new HttpError(404, 'This API key does not exist.');
    entry[1].revoked = true;
    return entry[0];
  },
  async findApiKey(hash: string) { const k = apiKeys.get(hash); return k && !k.revoked ? {owner: k.owner} : null; },
} as unknown as ReturnType<typeof createStore>;
const apiKeys = new Map<string, {id: string; owner: string; createdAt: number; last4: string; revoked: boolean}>();
const baseDeps: Parameters<typeof createHandler>[0] = {
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
};
const server = createServer(createHandler(baseDeps));
// A second instance with the edge secret on and a tiny anonymous tier, so limits are cheap to hit.
let clock = 0;
const edge = createServer(createHandler({...baseDeps, edgeSecret: 'edge-secret-value', limiter: (() => {
  const real = createLimiter(() => clock);
  return (key, tier) => real(key, key.startsWith('ip:') ? {perMinute: 3, perDay: 5} : {perMinute: 6, perDay: 100});
})()}));
const exportId = 'mp4mp4mp4mp4mp4mp4mp4mp4mp4mp4mp4';
let origin: string;
let edgeOrigin: string;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${(server.address() as {port: number}).port}`;
  await new Promise<void>((resolve) => edge.listen(0, '127.0.0.1', resolve)); edgeOrigin = `http://127.0.0.1:${(edge.address() as {port: number}).port}`;
});
after(() => Promise.all([server, edge].map((s) => new Promise<void>((resolve) => s.close(() => resolve())))));
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
test('MP4 export validates identity and props, reuses identical renders, and returns a signed link', async () => {
  assert.equal((await fetch(`${origin}/api/exports`, {method: 'POST'})).status, 401);
  assert.equal((await postExport(payload, 'anonymous')).status, 403);
  assert.equal((await postExport({...payload, props: {...props, texts: {...props.texts, headline: 'x'.repeat(25)}}})).status, 400);
  assert.equal(videoRenders, 0);
  const first = await postExport(payload);
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), {id: exportId, filename: 'my-shared-edit-made-with-cliphouse.mp4',
    url: `https://storage.test/exports/${exportId}/video.mp4?sig=1&name=my-shared-edit-made-with-cliphouse.mp4`});
  assert.equal((await postExport(payload)).status, 200);
  assert.equal(videoRenders, 1);
  // The old streaming route is gone: MP4 bytes never pass through the share service.
  assert.equal((await fetch(`${origin}/api/exports/${exportId}/video.mp4`)).status, 404);
  assert.equal(exportFilename({variantId: 'fallback', title: '!!!'}), 'fallback-made-with-cliphouse.mp4');
});
test('public share lookups and misses are cached', async () => {
  let reads = 0;
  const get = store.get;
  store.get = async (key: string) => { reads++; return get.call(store, key); };
  try {
    const missing = `${'q'.repeat(31)}1`;
    const first = await fetch(`${origin}/s/${missing}`);
    assert.equal(first.status, 404);
    assert.match(first.headers.get('cache-control') || '', /s-maxage=300/);
    await fetch(`${origin}/api/shares/${missing}`);
    assert.equal(reads, 1);
    assert.equal((await fetch(`${origin}/api/shares`, {method: 'POST'})).headers.get('cache-control'), 'no-store');
  } finally { store.get = get; }
});

const mcp = (body: unknown, {base = origin, token, edgeHeader = true, ip = '10.0.0.1'}: {base?: string; token?: string; edgeHeader?: boolean; ip?: string} = {}) =>
  fetch(`${base}/mcp`, {method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: {
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'CF-Connecting-IP': ip,
    ...(token ? {Authorization: `Bearer ${token}`} : {}), ...(edgeHeader && base !== origin ? {'X-Cliphouse-Edge': 'edge-secret-value'} : {}),
  }});
const rpc = (method: string, params: unknown = {}, id = 1) => ({jsonrpc: '2.0', id, method, params});
const call = async (name: string, args: unknown) => {
  const response = await mcp(rpc('tools/call', {name, arguments: args}));
  assert.equal(response.status, 200);
  const result = (await response.json()).result;
  return {...result, data: result.isError ? null : JSON.parse(result.content[0].text)};
};

test('the edge secret blocks direct public reads and leaves exempt routes alone', async () => {
  for (const path of [`/s/${'q'.repeat(32)}`, `/api/shares/${'q'.repeat(32)}`]) {
    assert.equal((await fetch(`${edgeOrigin}${path}`)).status, 403);
    assert.equal((await fetch(`${edgeOrigin}${path}`, {headers: {'X-Cliphouse-Edge': 'wrong-secret-value'}})).status, 403);
    assert.equal((await fetch(`${edgeOrigin}${path}`, {headers: {'X-Cliphouse-Edge': 'edge-secret-value'}})).status, 404);
  }
  assert.equal((await mcp(rpc('tools/list'), {base: edgeOrigin, edgeHeader: false, ip: '10.9.9.9'})).status, 403);
  assert.equal((await fetch(`${edgeOrigin}/health`)).status, 200);
  assert.equal((await fetch(`${edgeOrigin}/api/shares`, {method: 'POST'})).status, 401, 'authenticated routes are exempt');
  assert.equal((await fetch(`${edgeOrigin}/api/exports`, {method: 'POST'})).status, 401);
  assert.equal((await fetch(`${origin}/s/${'q'.repeat(32)}`)).status, 404, 'no secret configured: unchanged');
});
test('MCP lists the catalog tools and answers from the catalog', async () => {
  const init = await mcp(rpc('initialize', {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'test', version: '1'}}));
  assert.equal(init.status, 200);
  assert.equal(init.headers.get('mcp-session-id'), null, 'stateless');
  const list = await (await mcp(rpc('tools/list'))).json();
  assert.deepEqual(list.result.tools.map((t: {name: string}) => t.name).sort(), ['build_edit_link', 'get_template_spec', 'render_preview', 'render_previews', 'search_templates']);
  assert.ok(list.result.tools.filter((t: {name: string}) => !t.name.startsWith('render_preview')).every((t: {annotations?: {readOnlyHint?: boolean}}) => t.annotations?.readOnlyHint));
  const found = await call('search_templates', {query: variant.title.split(' ')[0], limit: 50 > 20 ? 20 : 5});
  assert.match(found.data.searchId, /^[A-Za-z0-9_-]{16}$/);
  assert.equal(found.data.contractVersion, (await import('../src/agent/goals.ts')).AGENT_CONTRACT_VERSION);
  assert.ok(found.data.results.some((t: {id: string}) => t.id === variant.id));
  assert.ok(found.data.results.every((t: Record<string, unknown>) => !('engine' in t)), 'engine is hidden by default');
  assert.ok(found.data.results.length <= 20);
  assert.equal(found.data.results[0].spec.startsWith('https://cliphou.se/templates/'), true);
  const vertical = await call('search_templates', {query: 'app promo', aspect: '9:16', maxSeconds: 12, limit: 4});
  assert.ok(vertical.data.results.length > 0 && vertical.data.results.every((t: {aspect: string; seconds: number}) => t.aspect === '9:16' && t.seconds <= 12));
  assert.match(vertical.data.results[0].preview, /^https:\/\/cliphou.se\/previews\/.+\.mp4$/);
  assert.equal((await call('search_templates', {query: 'logo intro', limit: 1})).data.results[0].id, 'wordmark-reveal');
  const waitlist = await call('search_templates', {goal: 'grow-waitlist', limit: 3});
  assert.equal(waitlist.data.goal, 'grow-waitlist');
  assert.ok(waitlist.data.results.every((t: {goals: string[]}) => t.goals.includes('grow-waitlist')));
  assert.equal((await call('search_templates', {query: 'we need a waitlist video', limit: 1})).data.results[0].goals.includes('grow-waitlist'), true);
  assert.ok((await call('search_templates', {engine: 'hyperframes', limit: 1})).data.results[0].engine);
  assert.match((await init.clone().json()).result.instructions, /search_templates/);
  const spec = await call('get_template_spec', {variantId: variant.id});
  assert.equal(spec.data.kind, 'template');
  assert.deepEqual(spec.data.props, variant.props);
  assert.equal((await call('get_template_spec', {variantId: 'missing-template'})).isError, true);
  const link = await call('build_edit_link', {variantId: variant.id, props});
  assert.match(link.data.url, new RegExp(`^https://cliphou.se/#/v/${variant.id}\\?props=`));
  assert.deepEqual(JSON.parse(decodeURIComponent(new URL(link.data.url.replace('#', '')).searchParams.get('props')!)), props);
  const bad = await call('build_edit_link', {variantId: variant.id, props: {...props, texts: {...props.texts, headline: 'x'.repeat(25)}}});
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /too long/);
});
test('MCP rejects GET and oversized bodies', async () => {
  assert.equal((await fetch(`${origin}/mcp`)).status, 405);
  assert.equal((await mcp({jsonrpc: '2.0', id: 1, method: 'tools/list', params: {pad: 'x'.repeat(17_000)}}, {ip: '10.0.0.2'})).status, 413);
});
test('anonymous and API key tiers are limited separately and return 429 headers', async () => {
  const opts = {base: edgeOrigin, ip: '10.1.1.1'};
  for (let i = 0; i < 3; i++) assert.equal((await mcp(rpc('tools/list'), opts)).status, 200);
  const limited = await mcp(rpc('tools/list'), opts);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal(limited.headers.get('ratelimit-limit'), '3');
  assert.equal(limited.headers.get('ratelimit-remaining'), '0');
  assert.ok(Number(limited.headers.get('ratelimit-reset')) > 0);
  assert.match((await limited.json()).error.message, /API key/);
  assert.equal((await mcp(rpc('tools/list'), {...opts, ip: '10.1.1.2'})).status, 200, 'other IPs unaffected');
  clock += 60_000;
  assert.equal((await mcp(rpc('tools/list'), opts)).status, 200, 'minute window resets');
  assert.equal((await mcp(rpc('tools/list'), opts)).status, 429, 'daily cap of 5 reached');

  const created = await (await fetch(`${origin}/api/keys`, {method: 'POST', headers: {Authorization: 'Bearer dana'}})).json();
  for (let i = 0; i < 6; i++) assert.equal((await mcp(rpc('tools/list'), {...opts, token: created.key})).status, 200, 'key tier is higher');
  assert.equal((await mcp(rpc('tools/list'), {...opts, token: created.key})).status, 429);
  assert.equal((await mcp(rpc('tools/list'), {...opts, token: 'chk_unknownunknownunknownunknown'})).status, 401);
  assert.equal((await mcp(rpc('tools/list'), {...opts, token: 'not-a-key'})).status, 401);
});
test('API keys require a Google identity, are capped at 2, and can be revoked', async () => {
  assert.equal((await fetch(`${origin}/api/keys`, {method: 'POST'})).status, 401);
  assert.equal((await fetch(`${origin}/api/keys`, {method: 'POST', headers: {Authorization: 'Bearer anonymous'}})).status, 403);
  const auth = {Authorization: 'Bearer erin'};
  const first = await (await fetch(`${origin}/api/keys`, {method: 'POST', headers: auth})).json();
  assert.match(first.key, /^chk_/);
  assert.equal((await fetch(`${origin}/api/keys`, {method: 'POST', headers: auth})).status, 201);
  assert.equal((await fetch(`${origin}/api/keys`, {method: 'POST', headers: auth})).status, 409);
  const listed = await (await fetch(`${origin}/api/keys`, {headers: auth})).json();
  assert.equal(listed.keys.length, 2);
  assert.ok(listed.keys.every((k: Record<string, unknown>) => !('key' in k) && !('hash' in k)));
  assert.equal((await mcp(rpc('tools/list'), {token: first.key, ip: '10.2.2.2'})).status, 200);
  assert.equal((await fetch(`${origin}/api/keys/${first.id}`, {method: 'DELETE', headers: {Authorization: 'Bearer mallory'}})).status, 404);
  assert.equal((await fetch(`${origin}/api/keys/${first.id}`, {method: 'DELETE', headers: auth})).status, 200);
  assert.equal((await mcp(rpc('tools/list'), {token: first.key, ip: '10.2.2.2'})).status, 401, 'revoked key is rejected immediately');
});
test('MCP registry proof and discovery document are public, cacheable, and bypass the edge check', async () => {
  for (const base of [origin, edgeOrigin]) {
    const auth = await fetch(`${base}/.well-known/mcp-registry-auth`);
    assert.equal(auth.status, 200);
    assert.match(await auth.text(), /^v=MCPv1; k=ed25519; p=[A-Za-z0-9+/]{43}=\n$/);
    const doc = await fetch(`${base}/.well-known/mcp.json`);
    assert.equal(doc.status, 200);
    assert.match(doc.headers.get('cache-control') || '', /max-age=300/);
    const body = await doc.json();
    assert.equal(body.name, 'se.cliphou/templates');
    assert.deepEqual(body.remotes, [{type: 'streamable-http', url: 'https://cliphou.se/mcp'}]);
    assert.equal(body.agentContract.version, (await import('../src/agent/goals.ts')).AGENT_CONTRACT_VERSION);
    assert.ok(body.tools.includes('render_previews'));
  }
  const init = await (await mcp(rpc('initialize', {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 't', version: '1'}}), {ip: '10.3.3.3'})).json();
  assert.equal(init.result.serverInfo.version, (await import('../server.json', {with: {type: 'json'}})).default.version);
});
