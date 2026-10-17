import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {addition, additionDigest, allModels, contract, digest, ensureBudget, parseSource, priceCeiling, protocol, reserveCost, validateAddition, validateResults} from './protocol.mjs';

const blank = () => ({version: protocol.version, edition: '2026-10', updatedAt: '2026-10-08', status: 'awaiting-runs', entries: []});
const entry = () => ({
  model: protocol.models[0].key, brief: protocol.briefs[0].id, run: 1, status: 'rendered', attempts: 1,
  firstAttemptPassed: true, provider: 'test-provider', generatedAt: '2026-10-08T12:00:00.000Z',
  costUsd: 0.123, generationMs: 1200, renderMs: 4000,
  video: 'benchmark/media/test/video.mp4', poster: 'benchmark/media/test/poster.jpg',
  source: 'benchmark/media/test/source.tsx', request: 'benchmark/media/test/request.json', reviews: [],
});
const dataWith = (entries) => ({...blank(), status: 'in-progress', entries});
const review = (reviewer) => ({reviewer, scores: {design: 4, motion: 3, readability: 5, adherence: 4}});

test('protocol has ten distinct models and sixty reproducible jobs', () => {
  assert.equal(protocol.models.length, 10);
  assert.equal(new Set(protocol.models.map((model) => model.id)).size, 10);
  assert.equal(protocol.models.length * protocol.briefs.length * protocol.runs, 60);
  assert.equal(protocol.format.durationInFrames, protocol.format.fps * 12);
  assert.equal(protocol.rubric.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.equal(digest.length, 64);
  assert.match(contract, /No existing video examples/);
});
test('default command is a dry run without credentials or network', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/benchmark/run.mjs'], {encoding: 'utf8', env: {...process.env, OPENROUTER_API_KEY: ''}}));
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.jobs.length, 60);
});
test('execution refuses a missing key before checking Docker', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/benchmark/run.mjs', '--execute'], {stdio: 'pipe', env: {...process.env, OPENROUTER_API_KEY: ''}}), /OPENROUTER_API_KEY server-side/);
});
test('late addition keeps the frozen protocol and lists the added model first', () => {
  assert.equal(digest, '67692ee132be8b02f695632fabe2e49012d5b06fab50329b5dce59d71f65e0af', 'protocol 1.1 must stay unchanged');
  assert.notEqual(additionDigest, digest);
  assert.equal(additionDigest, 'e38d1a3d58adb126bf9017b7214e51971bcb8fd7aa39f983db4e804bd9a76bca', 'addition A1 must stay unchanged');
  assert.deepEqual(allModels.slice(0, 3).map((model) => model.key), ['deepseek-v4-1-flash-1017', 'muse-spark-open', 'gemini-4-argon'], 'newest addition first');
  assert.equal(new Set(allModels.map((model) => model.id)).size, 13);
  const planA3 = JSON.parse(execFileSync(process.execPath, ['scripts/benchmark/run.mjs', '--addition-id', 'A3'], {encoding: 'utf8', env: {...process.env, OPENROUTER_API_KEY: ''}}));
  assert.ok(planA3.jobs.length === 6 && planA3.jobs.every((job) => job.startsWith('deepseek-v4-1-flash-1017-')));
  const planA2 = JSON.parse(execFileSync(process.execPath, ['scripts/benchmark/run.mjs', '--addition-id', 'A2'], {encoding: 'utf8', env: {...process.env, OPENROUTER_API_KEY: ''}}));
  assert.ok(planA2.jobs.length === 6 && planA2.jobs.every((job) => job.startsWith('muse-spark-open-')));
  assert.notEqual(planA2.protocolHash, additionDigest);
  const plan = JSON.parse(execFileSync(process.execPath, ['scripts/benchmark/run.mjs', '--addition'], {encoding: 'utf8', env: {...process.env, OPENROUTER_API_KEY: ''}}));
  assert.equal(plan.jobs.length, 6);
  assert.ok(plan.jobs.every((job) => job.startsWith('gemini-4-argon-')));
  const base = {id: addition.id, edition: addition.edition, updatedAt: '2026-10-13'};
  const added = {...entry(), model: 'gemini-4-argon'};
  assert.equal(validateAddition({...base, entries: [added]}, blank()).entries.length, 1);
  assert.throws(() => validateAddition({...base, entries: [{...added, model: 'opus-5-5'}]}, blank()));
  assert.throws(() => validateAddition({...base, entries: [added]}, {entries: [entry()]}), /overwrite/);
  assert.throws(() => validateResults(dataWith([added])), 'additions cannot enter the original results');
});
test('submission format is structured and rejects surplus files', () => {
  const source = 'export function BenchmarkVideo() { return <div>Deterministic video</div>; }';
  assert.equal(parseSource(JSON.stringify({source})), source);
  assert.throws(() => parseSource(`\`\`\`tsx\n${source}\n\`\`\``));
  assert.throws(() => parseSource(JSON.stringify({source, extraFile: 'unsafe'})));
});
test('price reservations include expensive override tiers', () => {
  const rates = priceCeiling({prompt: '0.000001', completion: '0.00001', overrides: [{prompt: '0.000003', completion: '0.00003'}]});
  assert.deepEqual(rates, {prompt: 0.000003, completion: 0.00003});
  assert.ok(reserveCost([{role: 'user', content: 'Test'}], rates) > protocol.limits.maxTokens * rates.completion);
  assert.throws(() => priceCeiling({prompt: 'unknown'}));
});
test('budget guard prevents overrun, unresolved spend, and invalid reservations', () => {
  const ledger = {charges: [{kind: 'generation', cost: 24.75}], pending: null};
  ensureBudget(ledger, 'generation', 0.25);
  assert.throws(() => ensureBudget(ledger, 'generation', 0.251), /generation budget/);
  assert.throws(() => ensureBudget({...ledger, pending: {}}, 'repair', 0), /unknown cost/);
  assert.throws(() => ensureBudget({charges: [{kind: 'repair', cost: 9.9}], pending: null}, 'repair', 0.2), /repair budget/);
  assert.throws(() => ensureBudget(ledger, 'generation', NaN));
});
test('concurrent requests reserve their full cost before another request starts', () => {
  const ledger = {charges: [{kind: 'generation', cost: 20}], pending: [{kind: 'generation', reservation: 4.5}]};
  assert.throws(() => ensureBudget(ledger, 'generation', 0), /unknown cost/);
  ensureBudget(ledger, 'generation', 0.5, {allowInFlight: true});
  assert.throws(() => ensureBudget(ledger, 'generation', 0.6, {allowInFlight: true}), /generation budget/);
  ensureBudget({...ledger, pending: []}, 'generation', 1);
});
test('empty results are pending, never failed or zero-scored', () => {
  assert.equal(validateResults(blank()).entries.length, 0);
  assert.throws(() => validateResults({...blank(), status: 'complete'}), /status/);
  assert.equal(validateResults(dataWith([entry()])).entries[0].reviews.length, 0);
});
test('publication rejects fabricated partial scores and duplicate reviewers', () => {
  assert.throws(() => validateResults(dataWith([{...entry(), reviews: [review('A')]}])));
  assert.throws(() => validateResults(dataWith([{...entry(), reviews: [review('A'), review('A')]}])));
  assert.equal(validateResults(dataWith([{...entry(), reviews: [review('A'), review('B')]}])).entries[0].reviews.length, 2);
});
test('publication requires actual artifacts and rejects traversal and duplicates', () => {
  assert.throws(() => validateResults(dataWith([{...entry(), video: undefined}])));
  assert.throws(() => validateResults(dataWith([{...entry(), video: 'benchmark/media/../../secret.mp4'}])));
  assert.throws(() => validateResults(dataWith([entry(), entry()])), /Duplicate/);
  assert.throws(() => validateResults(dataWith([entry()]), '/nonexistent'), /Missing benchmark artifact/);
});
test('first-attempt status and failed results cannot misrepresent success', () => {
  assert.throws(() => validateResults(dataWith([{...entry(), attempts: 2}])));
  assert.throws(() => validateResults(dataWith([{...entry(), status: 'failed'}])));
  const {video, poster, ...failed} = entry();
  assert.equal(validateResults(dataWith([{...failed, status: 'failed', firstAttemptPassed: false}])).entries[0].status, 'failed');
});
