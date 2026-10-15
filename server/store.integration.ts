import assert from 'node:assert/strict';
import {beforeEach, test} from 'node:test';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {createStore, hashKey} from './store.ts';
import {validateShare} from './model.ts';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('These tests require the Firestore emulator.');
initializeApp({projectId: 'demo-cliphouse'});
const db = getFirestore();
const store = createStore('demo-cliphouse.appspot.com');
const variant = manifest.variants[0];
const value = validateShare({variantId: variant.id, props: variant.props});
beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-cliphouse/databases/(default)/documents`, {method: 'DELETE'});
  process.env.SHARES_PER_USER_DAY = '10';
  process.env.SHARES_PER_DAY = '100';
});

test('concurrent duplicate publishes reserve exactly one render', async () => {
  const results = await Promise.allSettled([store.reserve('alice', 'same', value), store.reserve('alice', 'same', value)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  const jobs = await db.collection('shareJobs').get();
  assert.equal(jobs.size, 1);
  const shares = await db.collection('shares').get();
  assert.equal(shares.size, 1);
  assert.equal(shares.docs[0].data().owner, 'alice');
  await assert.rejects(store.get(shares.docs[0].id), {status: 404});
});
test('completed retries reuse immutable props without using quota', async () => {
  const first = await store.reserve('alice', 'retry', value);
  const video = {...first.video!, status: 'ready'};
  await db.doc(`shares/${video.id}`).set(video);
  await db.doc('shareJobs/retry').set({id: video.id, status: 'ready'});
  process.env.SHARES_PER_USER_DAY = '1';
  const next = await store.reserve('alice', 'retry', value);
  assert.equal(next.ready?.id, video.id);
  assert.deepEqual(next.ready?.props, value.props);
});
test('per-user and global limits are enforced transactionally', async () => {
  process.env.SHARES_PER_USER_DAY = '1';
  process.env.SHARES_PER_DAY = '2';
  await store.reserve('alice', 'a', value);
  await assert.rejects(store.reserve('alice', 'b', value), {status: 429});
  await store.reserve('bob', 'b', value);
  await assert.rejects(store.reserve('charlie', 'c', value), {status: 429});
  assert.equal((await db.collection('shares').get()).size, 2);
});
test('failed and expired jobs can be retried, and other users cannot delete', async () => {
  const first = await store.reserve('alice', 'failed', value);
  await store.fail('failed', first.video!.id);
  assert.equal((await db.doc(`shares/${first.video!.id}`).get()).exists, false);
  const retry = await store.reserve('alice', 'failed', value);
  assert.ok(retry.video);
  await db.doc('shareJobs/failed').update({leaseUntil: 0});
  const expired = await store.reserve('alice', 'failed', value);
  assert.notEqual(expired.video?.id, retry.video?.id);
  await db.doc(`shares/${expired.video!.id}`).update({status: 'ready'});
  await assert.rejects(store.remove(expired.video!.id, 'bob'), {status: 403});
});
test('API keys store only hashes, cap at two per user, and revoke', async () => {
  const first = await store.createApiKey('alice');
  assert.match(first.key, /^chk_[A-Za-z0-9_-]{32}$/);
  const stored = (await db.doc(`apiKeys/${hashKey(first.key)}`).get()).data();
  assert.deepEqual({owner: stored?.owner, revoked: stored?.revoked}, {owner: 'alice', revoked: false});
  assert.ok(!JSON.stringify((await db.collection('apiKeys').get()).docs.map((d) => d.data())).includes(first.key), 'raw key is never stored');
  assert.deepEqual(await store.findApiKey(hashKey(first.key)), {owner: 'alice'});
  await store.createApiKey('alice');
  await assert.rejects(store.createApiKey('alice'), {status: 409});
  assert.equal((await store.listApiKeys('alice')).length, 2);
  await assert.rejects(store.revokeApiKey('bob', first.id), {status: 404});
  assert.equal(await store.revokeApiKey('alice', first.id), hashKey(first.key));
  assert.equal(await store.findApiKey(hashKey(first.key)), null);
  assert.equal((await store.listApiKeys('alice')).length, 1);
  await store.createApiKey('alice');
});
test('search and event logs are written with a server timestamp, and preview quota counts per caller', async () => {
  await store.logSearch({searchId: 's1', query: 'logo intro', filters: {aspect: '16:9'}, resultIds: ['a'], resultCount: 1, empty: false, topScore: 3,
    engines: ['remotion'], client: 'cliphouse-skill/1.2', caller: 'ip:1.2.3.4'});
  await store.logEvent({searchId: 's1', type: 'preview', variantId: 'a', client: 'x', caller: 'ip:1.2.3.4', ms: 900, cached: false, poster: true, engine: undefined});
  const [search] = (await db.collection('searches').get()).docs.map((d) => d.data());
  assert.equal(search.query, 'logo intro');
  assert.ok(search.at.toMillis() > 0);
  const [event] = (await db.collection('events').get()).docs.map((d) => d.data());
  assert.equal(event.poster, true);
  assert.equal('engine' in event, false, 'undefined fields are dropped');
  process.env.PREVIEWS_PER_IP_DAY = '2';
  process.env.PREVIEWS_PER_DAY = '3';
  await store.reservePreview('ip:1', false);
  await store.reservePreview('ip:1', false);
  await assert.rejects(store.reservePreview('ip:1', false), {status: 429});
  await store.reservePreview('key:kim', true);
  await assert.rejects(store.reservePreview('ip:2', false), {status: 429}, 'global cap');
});
