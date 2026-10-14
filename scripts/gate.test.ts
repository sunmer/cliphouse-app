import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FREE_VIDEOS, checkOpen, looksAutomated} from '../src/services/gate.ts';

const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

test('counts distinct videos, prompts at 2, and gates the 4th new video', () => {
  const store = memory();
  assert.equal(FREE_VIDEOS, 3);
  assert.equal(checkOpen('a', store), 'open');
  assert.equal(checkOpen('a', store), 'open');
  assert.equal(checkOpen('b', store), 'prompt');
  assert.equal(checkOpen('b', store), 'open');
  assert.equal(checkOpen('c', store), 'open');
  assert.equal(checkOpen('d', store), 'gate');
  assert.equal(checkOpen('d', store), 'gate', 'a blocked video is not recorded');
  for (const id of ['a', 'b', 'c']) assert.equal(checkOpen(id, store), 'open', 'opened videos stay free');
});
test('the soft prompt shows only once and broken storage never blocks', () => {
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
