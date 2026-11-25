import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FREE_VIDEOS, checkOpen, looksAutomated} from '../src/services/gate.ts';

const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

test('allows unlimited browsing without prompting or gating', () => {
  const store = memory();
  assert.equal(FREE_VIDEOS, Infinity);
  for (const id of ['a', 'a', 'b', 'c', 'd', 'e', 'f']) {
    assert.equal(checkOpen(id, store), 'open');
  }
  assert.deepEqual(JSON.parse(store.getItem('cliphouse:opened-videos') ?? '[]'), ['a', 'b', 'c', 'd', 'e', 'f']);
});
test('broken storage never blocks opening a video', () => {
  const store = memory();
  checkOpen('a', store); checkOpen('b', store);
  store.setItem('cliphouse:opened-videos', '["a"]');
  assert.equal(checkOpen('z', store), 'open');
  const broken = {getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }};
  assert.equal(checkOpen('a', broken), 'open');
  assert.equal(checkOpen('a', {getItem: () => 'not json', setItem: () => {}}), 'open');
});
test('automated browsers are detected', () => {
  assert.equal(looksAutomated({webdriver: true, userAgent: 'Mozilla/5.0'}), true);
  assert.equal(looksAutomated({webdriver: false, userAgent: 'Googlebot/2.1'}), true);
  assert.equal(looksAutomated({webdriver: false, userAgent: 'Mozilla/5.0 HeadlessChrome/153'}), true);
  assert.equal(looksAutomated({webdriver: false, userAgent: 'Mozilla/5.0 (Macintosh) Chrome/153.0 Safari/537.36'}), false);
});
