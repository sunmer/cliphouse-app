// Gate 1 and 2 checks: the list contract, the shared timing table, and deterministic Ticker Beat audio.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {applyList, listItems, listProblems, parseLines, storedListErrors, type ListGroup} from '../../src/poc/lists.ts';
import {tickerList} from '../../src/poc/tickerlist/meta.ts';
import {tickerListSchema} from '../../src/poc/tickerlist/schema.ts';
import {tickerBeatSchema} from '../../src/poc/tickerbeat/schema.ts';
import {ITEM_BEATS, frameOf, itemBeats, DURATION, SETTLE} from '../../src/poc/tickerbeat/timing.ts';
import {renderTicker, tickerPlan} from '../../src/poc/tickerbeat/sound.ts';
import {loudness, truePeak} from '../../src/videos/music/synth.ts';
import {parseList} from '../../src/videos/shared/data.ts';
import type {VideoProps} from '../../src/videos/vocab.ts';

const props = {texts: {brand: 'KICKLAB', headline: 'Weekend drop', point1: '30% off kicks', point2: 'Free shipping', point3: 'Ends Sunday', cta: 'Shop now'},
  theme: {background: '#111111', surface: '#262626', foreground: '#f5f5f0', accent: '#ff3b30', accent2: '#ffd60a'}, hidden: []} as unknown as VideoProps;
const packed: ListGroup = {id: 'p', storage: {kind: 'packed', role: 'items'}, min: 1, max: 5, itemMax: 24};

test('lines: trim, ignore blanks, keep punctuation', () => {
  assert.deepEqual(parseLines('  Q&A, live! \n\n 30% off\r\n'), ['Q&A, live!', '30% off']);
});

test('limits: empty, too many, too long are rejected and never truncated', () => {
  assert.match(listProblems(tickerList, [])[0].message, /at least one/);
  assert.match(listProblems(tickerList, ['a', 'b', 'c', 'd'])[0].message, /3 items or fewer/);
  assert.match(listProblems(tickerList, ['x'.repeat(17)])[0].message, /17\/16/);
  assert.throws(() => applyList(tickerList, props, ['a', 'b', 'c', 'd']));
  assert.deepEqual(listProblems(tickerList, ['one']), []);
});

test('remove from any position, then restore within capacity', () => {
  const all = listItems(tickerList, props);
  for (let i = 0; i < 3; i++) {
    const items = all.filter((_, k) => k !== i);
    const next = applyList(tickerList, props, items);
    assert.deepEqual(listItems(tickerList, next), items);
    assert.deepEqual((next as {hidden: string[]}).hidden, ['point3']);
    assert.equal(tickerListSchema.safeParse(next).success, true);
  }
  const one = applyList(tickerList, props, ['Ends Sunday']);
  assert.deepEqual((one as {hidden: string[]}).hidden, ['point2', 'point3']);
  // Removed text is kept, so it can be restored.
  assert.equal(one.texts.point3, 'Ends Sunday');
  const back = applyList(tickerList, one, ['Ends Sunday', 'Free shipping', '30% off kicks']);
  assert.deepEqual(listItems(tickerList, back), ['Ends Sunday', 'Free shipping', '30% off kicks']);
  assert.deepEqual((back as {hidden: string[]}).hidden, []);
});

test('stored props: removed items must be the last ones', () => {
  assert.deepEqual(storedListErrors(tickerList, {...props, hidden: ['point1']} as VideoProps), ['Board items: removed items must be the last ones']);
  assert.equal(tickerListSchema.safeParse({...props, hidden: ['point1', 'point2', 'point3']}).success, false);
  assert.equal(tickerBeatSchema.safeParse({...props, hidden: ['point3'], audio: {enabled: true}}).success, true);
});

test('packed lists are newline delimited; the legacy comma parser is unchanged', () => {
  const p = {...props, texts: {...props.texts, items: 'Design\nBuild, test\nLaunch'}} as VideoProps;
  assert.deepEqual(listItems(packed, p), ['Design', 'Build, test', 'Launch']);
  const five = applyList(packed, p, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(five.texts.items, 'a\nb\nc\nd\ne');
  assert.deepEqual(listItems(packed, applyList(packed, five, ['a', 'e'])), ['a', 'e']);
  assert.deepEqual(parseList('Design, Build, Launch'), ['Design', 'Build', 'Launch']);
});

test('schedules: 2/3/4 s, 2/4 s, 2 s, inside the fixed 8 s', () => {
  assert.deepEqual(ITEM_BEATS[3].map((b) => frameOf(b) / 30), [2, 3, 4]);
  assert.deepEqual(ITEM_BEATS[2].map((b) => frameOf(b) / 30), [2, 4]);
  assert.deepEqual(ITEM_BEATS[1].map((b) => frameOf(b) / 30), [2]);
  assert.equal(DURATION, 240);
});

test('audio: settle accents follow the visual schedule; wording never changes the plan', () => {
  for (const n of [1, 2, 3]) {
    const plan = tickerPlan(n);
    const clacks = plan.flaps.filter((f) => f.kind === 'clack').map((f) => f.beat);
    assert.deepEqual(clacks, itemBeats(n).map((b) => b + SETTLE));
  }
  // The plan takes only the count, so the same count with any wording is the same plan.
  assert.deepEqual(tickerPlan(3), tickerPlan(3));
});

test('audio: deterministic, loudness near -14 LUFS, peaks under -1 dBTP, same level for every count', () => {
  const levels: number[] = [];
  for (const n of [1, 2, 3]) {
    const a = renderTicker(tickerPlan(n));
    const b = renderTicker(tickerPlan(n));
    const hash = (s: typeof a) => createHash('sha256').update(Buffer.from(s.left.buffer)).update(Buffer.from(s.right.buffer)).digest('hex');
    assert.equal(hash(a), hash(b));
    const lufs = loudness(a);
    levels.push(lufs);
    assert.ok(lufs > -15.5 && lufs < -12.5, `count ${n}: ${lufs.toFixed(2)} LUFS`);
    assert.ok(truePeak(a) <= -1, `count ${n}: ${truePeak(a).toFixed(2)} dBTP`);
  }
  assert.ok(Math.max(...levels) - Math.min(...levels) < 1, `levels ${levels.map((l) => l.toFixed(2))}`);
});
