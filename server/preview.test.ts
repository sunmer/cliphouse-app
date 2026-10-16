import assert from 'node:assert/strict';
import {after, before, beforeEach, test} from 'node:test';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {createHandler} from './app.ts';
import {HttpError} from './model.ts';
import {createLoopService, createPreviewService, createRemoteLoopRenderer, createRenderGate, loopWindow, type RenderPreview} from './preview.ts';
import {readFile} from 'node:fs/promises';
import {validateShare} from './model.ts';
import type {EventLog, SearchLog, createStore} from './store.ts';

const variant = manifest.variants.find((v) => v.id === 'showreel-nocturne')!;
const props = structuredClone(variant.props);
props.texts.headline = 'BLOOM';
const searches: SearchLog[] = [];
const events: EventLog[] = [];
const objects = new Map<string, Buffer>();
const quota = new Map<string, number>();
let failLogs = false;
let renders = 0;
let renderDelay = 0;
let renderFails = false;
let loops = 0;
let loopDelay = 0;
let loopFails = false;
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const webp = Buffer.from('RIFF\x0c\x00\x00\x00WEBPVP8X', 'latin1');
const store = {
  async logSearch(entry: SearchLog) { if (failLogs) throw new Error('down'); searches.push(entry); },
  async logEvent(entry: EventLog) { if (failLogs) throw new Error('down'); events.push(entry); },
  async previewExists(hash: string, ext = 'jpg') { return objects.has(`${hash}.${ext}`); },
  async savePreview(hash: string, image: string, ext = 'jpg') { objects.set(`${hash}.${ext}`, ext === 'webp' ? webp : jpeg); void image; },
  async previewAsset(hash: string, ext = 'jpg') {
    const bytes = objects.get(`${hash}.${ext}`);
    if (!bytes) throw new Error('missing');
    return {size: bytes.length, stream: () => Readable.from(bytes)};
  },
  async reservePreview(caller: string, keyed: boolean) {
    const used = quota.get(caller) ?? 0;
    if (used >= (caller.startsWith('ip:10.9.2.') || caller.startsWith('ip:10.9.3.') ? 10 : keyed ? 3 : 2)) throw new HttpError(429, 'Your daily preview limit has been reached.');
    quota.set(caller, used + 1);
  },
  async findApiKey() { return {owner: 'kim'}; },
} as unknown as ReturnType<typeof createStore>;
const render: RenderPreview = async (_value, signal) => {
  renders++;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, renderDelay);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, {once: true});
  });
  if (renderFails) throw new Error('chrome died');
  const image = path.join(tmpdir(), `preview-test-${renders}.jpg`);
  await writeFile(image, jpeg);
  return {image, cleanup: async () => {}};
};
const renderLoop: RenderPreview = async (_value, signal) => {
  loops++;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, loopDelay);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, {once: true});
  });
  if (loopFails) throw new Error('ffmpeg died');
  const image = path.join(tmpdir(), `loop-test-${loops}.webp`);
  await writeFile(image, webp);
  return {image, cleanup: async () => {}};
};
const deps = {
  store, origin: 'https://cliphou.se', origins: new Set(['https://cliphou.se']), version: 'test', assets: {file: 'a.js'},
  render: async () => ({image: '', cleanup: async () => {}}), renderVideo: async () => ({video: '', cleanup: async () => {}}),
  verify: async () => ({uid: 'x'}),
  preview: createPreviewService({store, render, origin: 'https://cliphou.se', version: 'test', budgetMs: 300, maxQueue: 2, concurrency: 1}),
} as unknown as Parameters<typeof createHandler>[0];
const server = createServer(createHandler(deps));
let origin = '';
// A second server with production queue limits, for batches.
const gate = createRenderGate();
const batchServer = createServer(createHandler({...deps,
  preview: createPreviewService({store, render, origin: 'https://cliphou.se', version: 'test', budgetMs: 1_000, gate}),
  loop: createLoopService({store, render: renderLoop, origin: 'https://cliphou.se', version: 'test', budgetMs: 600, renderBudgetMs: 3_000,
    concurrency: 3, gate})} as typeof deps));
let batchOrigin = '';
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as {port: number}).port}`;
  await new Promise<void>((resolve) => batchServer.listen(0, '127.0.0.1', resolve));
  batchOrigin = `http://127.0.0.1:${(batchServer.address() as {port: number}).port}`;
});
after(() => Promise.all([server, batchServer].map((s) => new Promise<void>((resolve) => s.close(() => resolve())))));
beforeEach(() => { searches.length = 0; events.length = 0; failLogs = false; renderDelay = 0; renderFails = false; loopDelay = 0; loopFails = false; });

let ipSeq = 0;
const call = async (name: string, args: unknown, headers: Record<string, string> = {}, base = origin) => {
  const res = await fetch(`${base}/mcp`, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    'CF-Connecting-IP': headers.ip ?? `10.8.0.${++ipSeq}`, 'User-Agent': 'cliphouse-skill/1.2', ...headers},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args}})});
  assert.equal(res.status, 200);
  const result = (await res.json()).result;
  return {...result, data: result.isError ? null : JSON.parse(result.content[0].text)};
};

test('search logs query, filters, results, client, and caller, and returns a searchId', async () => {
  const found = await call('search_templates', {query: '  logo intro  ', aspect: '16:9', limit: 3}, {ip: '10.7.7.7'});
  assert.equal(searches.length, 1);
  const [log] = searches;
  assert.equal(log.searchId, found.data.searchId);
  assert.equal(log.query, 'logo intro');
  assert.deepEqual(log.filters, {aspect: '16:9'});
  assert.deepEqual(log.resultIds, found.data.results.map((r: {id: string}) => r.id));
  assert.equal(log.empty, false);
  assert.ok(log.topScore > 0);
  assert.equal(log.client, 'cliphouse-skill/1.2');
  assert.equal(log.caller, 'ip:10.7.7.7');
  const none = await call('search_templates', {query: 'zzqx underwater basket weaving'});
  assert.equal(none.data.results.length, 0);
  assert.equal(searches[1].empty, true);
  assert.equal(searches[1].resultCount, 0);
});
test('a failed log write still returns results', async () => {
  failLogs = true;
  const found = await call('search_templates', {query: 'logo intro'});
  assert.ok(found.data.results.length > 0);
  assert.ok((await call('get_template_spec', {variantId: variant.id})).data);
});
test('searchId links spec, link, and preview events', async () => {
  const {data: {searchId}} = await call('search_templates', {query: 'showreel'});
  await call('get_template_spec', {variantId: variant.id, searchId});
  await call('build_edit_link', {variantId: variant.id, props, searchId});
  await call('render_preview', {variantId: variant.id, props, searchId});
  assert.deepEqual(events.map((e) => [e.type, e.searchId, e.variantId]), [['spec', searchId, variant.id], ['link', searchId, variant.id], ['preview', searchId, variant.id]]);
  assert.equal(events[2].poster, true);
  assert.equal(events[2].engine, 'remotion');
  assert.equal(typeof events[2].ms, 'number');
  const bad = await call('get_template_spec', {variantId: variant.id, searchId: 'not valid!'});
  assert.equal(bad.isError, true, 'malformed searchId is rejected by the schema');
});
test('render_preview rejects invalid props with the validation message', async () => {
  const bad = await call('render_preview', {variantId: variant.id, props: {...props, texts: {...props.texts, headline: 'x'.repeat(40)}}});
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /too long/);
  assert.equal(events.at(-1)?.error?.length ? true : false, true);
});
test('render_preview returns poster, null video, editor, and an inline image; repeats hit the cache', async () => {
  const edited = structuredClone(props);
  edited.texts.headline = 'CACHE ME';
  const before = renders;
  const first = await call('render_preview', {variantId: variant.id, props: edited});
  assert.match(first.data.poster, /^https:\/\/cliphou\.se\/p\/[a-f0-9]{64}\.jpg$/);
  assert.equal(first.data.video, null);
  assert.match(first.data.editor, new RegExp(`^https://cliphou.se/#/v/${variant.id}\\?props=`));
  assert.equal(first.content[1].type, 'image');
  assert.equal(first.content[1].mimeType, 'image/jpeg');
  const second = await call('render_preview', {variantId: variant.id, props: edited});
  assert.equal(second.data.poster, first.data.poster);
  assert.equal(renders, before + 1, 'cached poster is not rendered again');
  assert.equal(events.at(-1)?.cached, true);
  const hash = first.data.poster.match(/([a-f0-9]{64})/)[1];
  const served = await fetch(`${origin}/p/${hash}.jpg`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/jpeg');
  assert.match(served.headers.get('cache-control') || '', /s-maxage=\d+/);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), jpeg);
  assert.equal((await fetch(`${origin}/p/${'0'.repeat(64)}.jpg`)).status, 404);
  assert.equal((await fetch(`${origin}/p/../secret.jpg`)).status, 404);
});
test('preview quota applies per caller on renders only', async () => {
  const ip = '10.9.1.1';
  const fresh = (n: number) => { const p = structuredClone(props); p.texts.headline = `Q${n}`; return p; };
  assert.ok((await call('render_preview', {variantId: variant.id, props: fresh(1)}, {ip})).data.poster);
  assert.ok((await call('render_preview', {variantId: variant.id, props: fresh(2)}, {ip})).data.poster);
  const limited = await call('render_preview', {variantId: variant.id, props: fresh(3)}, {ip});
  assert.equal(limited.data.poster, null);
  assert.match(limited.data.message, /limit.*editor link/i);
  assert.ok(limited.data.editor);
  assert.ok((await call('render_preview', {variantId: variant.id, props: fresh(1)}, {ip})).data.poster, 'cache hits do not count');
  assert.ok((await call('render_preview', {variantId: variant.id, props: fresh(3)}, {ip: '10.9.1.2'})).data.poster, 'other callers unaffected');
});
test('a slow or failed render returns poster null with the editor link', async () => {
  renderDelay = 2_000;
  const slow = structuredClone(props);
  slow.texts.headline = 'SLOW';
  const started = Date.now();
  const timedOut = await call('render_preview', {variantId: variant.id, props: slow});
  assert.ok(Date.now() - started < 1_500, 'the budget bounds the call');
  assert.equal(timedOut.data.poster, null);
  assert.match(timedOut.data.message, /too long/);
  assert.ok(timedOut.data.editor);
  renderDelay = 0;
  renderFails = true;
  const broken = structuredClone(props);
  broken.texts.headline = 'BROKEN';
  const failed = await call('render_preview', {variantId: variant.id, props: broken});
  assert.equal(failed.data.poster, null);
  assert.equal(events.at(-1)?.poster, false);
});
test('previews are queued, not rejected, and a full queue degrades to the editor link', async () => {
  renderDelay = 100;
  const p = (n: number) => { const x = structuredClone(props); x.texts.headline = `QUEUE${n}`; return x; };
  const results = await Promise.all([1, 2, 3].map((n) => call('render_preview', {variantId: variant.id, props: p(n)})));
  assert.equal(results.filter((r) => r.data.poster).length, 2, 'two fit the queue');
  assert.equal(results.filter((r) => !r.data.poster).length, 1);
});
test('render_previews renders tailored posters for several templates in one call', async () => {
  const ids = ['bento-launch', 'prism-launch', 'feature-announcement'];
  const before = renders;
  const brand = {name: 'HejVinter', headline: 'Svarar när ni inte kan', points: ['Svenska samtal', 'Följdfrågor', 'Tydligt underlag'], cta: 'Testa demon',
    theme: {background: '#0e4549', accent: '#c24e1f'}};
  const r = await call('render_previews', {variantIds: ids, brand, searchId: 'abcdefgh1234'}, {ip: '10.9.2.1'}, batchOrigin);
  assert.deepEqual(r.data.results.map((x: {id: string}) => x.id), ids);
  for (const x of r.data.results) {
    assert.ok(x.poster, JSON.stringify(x.message)); assert.match(x.poster, /^https:\/\/cliphou\.se\/p\/[a-f0-9]{64}\.jpg$/);
    assert.equal(x.props.texts.brand, 'HejVinter');
    assert.equal(x.props.theme.background, '#0e4549');
    assert.match(x.editor, new RegExp(`/#/v/${x.id}\\?props=`));
  }
  assert.equal(r.content.filter((c: {type: string}) => c.type === 'image').length, 3);
  assert.equal(renders, before + 3);
  assert.ok(events.filter((e) => e.searchId === 'abcdefgh1234' && e.batch).length === 3);
  const again = await call('render_previews', {variantIds: ids, brand}, {ip: '10.9.2.1'}, batchOrigin);
  assert.equal(renders, before + 3, 'repeats come from the cache');
  assert.deepEqual(again.data.results.map((x: {poster: string}) => x.poster), r.data.results.map((x: {poster: string}) => x.poster));
});
test('render_previews rejects bad input and degrades per template', async () => {
  const unknown = await call('render_previews', {variantIds: ['nope'], brand: {name: 'X'}});
  assert.equal(unknown.isError, true);
  assert.match(unknown.content[0].text, /Unknown template/);
  const tooMany = await call('render_previews', {variantIds: ['a', 'b', 'c', 'd', 'e'], brand: {name: 'X'}});
  assert.equal(tooMany.isError, true);
  const color = await call('render_previews', {variantIds: ['bento-launch'], brand: {name: 'X', theme: {accent: 'red'}}});
  assert.equal(color.isError, true);
  renderFails = true;
  const failed = await call('render_previews', {variantIds: ['prism-launch'], brand: {name: 'Broken Co'}}, {ip: '10.9.2.2'}, batchOrigin);
  assert.equal(failed.data.results[0].poster, null);
  assert.match(failed.data.results[0].stockPoster, /\/previews\/prism-launch\.jpg$/);
  assert.ok(failed.data.results[0].editor);
});
test('render_previews with loop: true adds an animated WebP loop per template; repeats hit the cache', async () => {
  const ids = ['bento-launch', 'prism-launch', 'feature-announcement'];
  const brand = {name: 'LoopCo', headline: 'Moves in the grid', points: ['One', 'Two', 'Three'], cta: 'Try it'};
  const before = loops;
  const r = await call('render_previews', {variantIds: ids, brand, loop: true, searchId: 'loopsearch123'}, {ip: '10.9.3.1'}, batchOrigin);
  assert.ok(r.data, JSON.stringify(r.content));
  for (const x of r.data.results) {
    assert.match(x.video, /^https:\/\/cliphou\.se\/p\/[a-f0-9]{64}\.webp$/, JSON.stringify([x.videoMessage, x.message]));
    assert.equal(x.video.replace('.webp', '.jpg'), x.poster, 'poster and loop of one edit share the hash');
  }
  assert.equal(loops, before + 3);
  assert.equal(r.content.filter((c: {type: string}) => c.type === 'image').length, 3, 'inline images stay posters');
  assert.equal(events.filter((e) => e.searchId === 'loopsearch123' && e.type === 'loop' && e.poster).length, 3);
  const served = await fetch(`${batchOrigin}/p/${r.data.results[0].video.match(/([a-f0-9]{64})/)[1]}.webp`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), webp);
  await call('render_previews', {variantIds: ids, brand, loop: true}, {ip: '10.9.3.1'}, batchOrigin);
  assert.equal(loops, before + 3, 'cached loops are not rendered again');
});
test('render_previews without loop does not render loops or return a video field', async () => {
  const before = loops;
  const r = await call('render_previews', {variantIds: ['bento-launch'], brand: {name: 'NoLoop'}}, {ip: '10.9.3.2'}, batchOrigin);
  assert.equal(loops, before);
  assert.equal('video' in r.data.results[0], false);
  assert.ok(r.data.results[0].poster);
});
test('a slow loop keeps the poster, comes back pending, keeps rendering, and a repeat call picks it up', async () => {
  loopDelay = 2_000;
  const started = Date.now();
  const slow = await call('render_previews', {variantIds: ['prism-launch'], brand: {name: 'SlowLoop'}, loop: true}, {ip: '10.9.3.3'}, batchOrigin);
  assert.ok(Date.now() - started < 1_800, 'the loop budget bounds the call');
  assert.ok(slow.data.results[0].poster);
  assert.equal(slow.data.results[0].video, null);
  assert.equal(slow.data.results[0].videoPending, true);
  assert.equal(events.some((e) => e.type === 'loop'), false, 'a pending loop is not logged as an outcome');
  const before = loops;
  await new Promise((resolve) => setTimeout(resolve, 1_700));
  const later = await call('render_previews', {variantIds: ['prism-launch'], brand: {name: 'SlowLoop'}, loop: true}, {ip: '10.9.3.3'}, batchOrigin);
  assert.match(later.data.results[0].video, /\.webp$/, 'the render went on after the first call stopped waiting');
  assert.equal(loops, before, 'the repeat call reuses the render, it does not start another');
});
test('loop: "start" returns posters at once with loops pending; loop: true then returns the loops', async () => {
  loopDelay = 300;
  const ids = ['bento-launch', 'prism-launch'];
  const brand = {name: 'TwoStep', headline: 'Posters first'};
  const started = Date.now();
  const first = await call('render_previews', {variantIds: ids, brand, loop: 'start'}, {ip: '10.9.3.4'}, batchOrigin);
  assert.ok(Date.now() - started < 250, 'start does not wait for loops');
  for (const x of first.data.results) { assert.ok(x.poster); assert.equal(x.video, null); assert.equal(x.videoPending, true); }
  assert.equal(first.content.filter((c: {type: string}) => c.type === 'image').length, 2);
  const second = await call('render_previews', {variantIds: ids, brand, loop: true}, {ip: '10.9.3.4'}, batchOrigin);
  for (const x of second.data.results) assert.match(x.video, /\.webp$/);
  assert.equal(events.filter((e) => e.type === 'loop' && e.poster).length, 2);
});
test('a loop waits while a poster renders', async () => {
  const order: string[] = [];
  const g = createRenderGate();
  let release!: () => void;
  const poster = g.poster(async () => { order.push('poster start'); await new Promise<void>((r) => { release = r; }); order.push('poster end'); });
  const loop = g.whenIdle().then(() => order.push('loop start'));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(order, ['poster start']);
  release();
  await Promise.all([poster, loop]);
  assert.deepEqual(order, ['poster start', 'poster end', 'loop start']);
});
test('loop: "start" does not slow the posters: each poster renders before any loop', async () => {
  renderDelay = 80;
  loopDelay = 50;
  const order: string[] = [];
  const before = {renders, loops};
  const watch = setInterval(() => {
    if (renders > before.renders && order.at(-1) !== `p${renders}`) order.push(`p${renders}`);
    if (loops > before.loops && order.at(-1) !== `l${loops}`) order.push(`l${loops}`);
  }, 5);
  const r = await call('render_previews', {variantIds: ['bento-launch', 'prism-launch', 'feature-announcement'], brand: {name: 'Order Co'}, loop: 'start'}, {ip: '10.9.3.5'}, batchOrigin);
  await new Promise((resolve) => setTimeout(resolve, 600));
  clearInterval(watch);
  assert.equal(r.data.results.filter((x: {poster: string}) => x.poster).length, 3);
  const firstLoop = order.findIndex((s) => s.startsWith('l'));
  assert.ok(firstLoop === -1 || order.slice(firstLoop).every((s) => !s.startsWith('p') || Number(s.slice(1)) <= before.renders + 3), JSON.stringify(order));
  assert.equal(renders - before.renders, 3);
  assert.equal(loops - before.loops, 3, 'the loops still render in the background');
});
test('a failed loop keeps the poster and returns video null with a message', async () => {
  loopDelay = 0;
  loopFails = true;
  const failed = await call('render_previews', {variantIds: ['prism-launch'], brand: {name: 'BrokenLoop'}, loop: true}, {ip: '10.9.3.3'}, batchOrigin);
  assert.ok(failed.data.results[0].poster);
  assert.equal(failed.data.results[0].video, null);
  assert.match(failed.data.results[0].videoMessage, /could not be rendered/);
  assert.equal(events.at(-1)?.type, 'loop');
  assert.equal(events.at(-1)?.poster, false);
  const none = await call('render_previews', {variantIds: ['prism-launch'], brand: {name: 'NoRenderer'}, loop: true});
  assert.equal(none.data.results[0].video, null, 'a server without a loop renderer degrades');
  assert.equal((await fetch(`${batchOrigin}/p/${'0'.repeat(64)}.webp`)).status, 404);
  assert.equal((await fetch(`${batchOrigin}/p/${'0'.repeat(64)}.gif`)).status, 404);
});
test('loopWindow keeps four seconds inside the video, ending just after the poster frame', () => {
  assert.deepEqual(loopWindow({fps: 30, durationInFrames: 300, posterFrame: 178}), {start: 106, length: 120});
  assert.deepEqual(loopWindow({fps: 30, durationInFrames: 300, posterFrame: 20}), {start: 0, length: 120});
  assert.deepEqual(loopWindow({fps: 30, durationInFrames: 300, posterFrame: 299}), {start: 180, length: 120});
  assert.deepEqual(loopWindow({fps: 30, durationInFrames: 90, posterFrame: 60}), {start: 0, length: 90});
});
test('the remote loop renderer posts the edit with the ID token and checks the reply', async () => {
  const seen: {auth?: string; body?: {variantId: string; props: unknown}}[] = [];
  let reply: {status: number; type: string; body: Buffer} = {status: 200, type: 'image/webp', body: webp};
  const worker = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    seen.push({auth: req.headers.authorization, body: JSON.parse(Buffer.concat(chunks).toString('utf8'))});
    res.writeHead(reply.status, {'Content-Type': reply.type}).end(reply.body);
  });
  await new Promise<void>((resolve) => worker.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(worker.address() as {port: number}).port}`;
  try {
    const remote = createRemoteLoopRenderer(url, async () => 'Bearer test-token');
    const value = validateShare({variantId: variant.id, props});
    const out = await remote(value, AbortSignal.timeout(2_000));
    assert.deepEqual(await readFile(out.image), webp);
    await out.cleanup();
    assert.equal(seen[0].auth, 'Bearer test-token');
    assert.equal(seen[0].body?.variantId, variant.id);
    assert.deepEqual(seen[0].body?.props, value.props);
    reply = {status: 200, type: 'text/html', body: Buffer.from('<html>')};
    await assert.rejects(remote(value, AbortSignal.timeout(2_000)), /no WebP/);
    reply = {status: 500, type: 'text/plain', body: Buffer.from('boom')};
    await assert.rejects(remote(value, AbortSignal.timeout(2_000)), /answered 500/);
  } finally { await new Promise<void>((resolve) => worker.close(() => resolve())); }
});
