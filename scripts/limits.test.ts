import assert from 'node:assert/strict';
import {test} from 'node:test';
import {TIERS, clientIp, createLimiter} from '../server/limits.ts';

test('limits per minute and per day, then reset', () => {
  let t = 0;
  const limit = createLimiter(() => t);
  const tier = {perMinute: 2, perDay: 3};
  assert.equal(limit('a', tier).ok, true);
  assert.equal(limit('a', tier).remaining, 0);
  const over = limit('a', tier);
  assert.equal(over.ok, false);
  assert.ok(over.retryAfter >= 1 && over.retryAfter <= 60);
  assert.equal(limit('b', tier).ok, true, 'keys are independent');
  t = 60_000;
  assert.equal(limit('a', tier).ok, false, 'day cap reached (3rd counted attempt was rejected but counted)');
  t = 86_400_000;
  assert.equal(limit('a', tier).ok, true, 'day resets');
  assert.deepEqual(TIERS, {anonymous: {perMinute: 60, perDay: 1000}, key: {perMinute: 600, perDay: 20000}});
});
test('client IP prefers Cloudflare, then the first forwarded hop', () => {
  assert.equal(clientIp({'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2'}), '1.1.1.1');
  assert.equal(clientIp({'x-forwarded-for': '2.2.2.2, 3.3.3.3'}), '2.2.2.2');
  assert.equal(clientIp({}, '4.4.4.4'), '4.4.4.4');
});
