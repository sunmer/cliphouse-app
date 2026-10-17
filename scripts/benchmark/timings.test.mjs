import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {reportedTiming, validateTimings} from './timings.mjs';

const response = {id: 'gen-test', model: 'anthropic/claude-opus-5.5', provider: 'Test'};
const metadata = {data: {id: response.id, model: response.model, provider_name: response.provider, generation_time: 5234, latency: 12000}};
const entry = {video: 'benchmark/media/test/video.mp4', sourceSha256: 'a'.repeat(64),
  ...reportedTiming(metadata, response), fetchedAt: '2026-10-08T20:00:00.000Z'};
const data = entries => ({version: 1, metric: 'generation_time', unit: 'milliseconds', entries});
const baseline = {entries: [{model: 'opus-5-5', video: entry.video, status: 'rendered'}]};
const recovery = {entries: []};

test('timing collection defaults to no requests', () => {
  assert.match(execFileSync(process.execPath, ['scripts/benchmark/collect-timings.mjs'], {encoding: 'utf8'}), /No completions or renders/);
});
test('uses exact OpenRouter generation_time, not latency or client timing', () => {
  assert.equal(reportedTiming(metadata, response).generationTimeMs, 5234);
  assert.equal(reportedTiming({data: {...metadata.data, generation_time: 0}}, response).generationTimeMs, 0);
  assert.equal(reportedTiming({data: {...metadata.data, generation_time: null}}, response).generationTimeMs, null);
  for (const generation_time of [-1, '5234', undefined]) assert.throws(() => reportedTiming({data: {...metadata.data, generation_time}}, response));
});
test('metadata must match the successful generation, model, and provider', () => {
  for (const field of ['id', 'model', 'provider_name']) assert.throws(() => reportedTiming({data: {...metadata.data, [field]: 'different'}}, response));
  const resolvedModel = `${response.model}-20260910`;
  assert.equal(reportedTiming({data: {...metadata.data, model: resolvedModel}}, response).resolvedModel, resolvedModel);
  const snapshot = {...response, model: 'deepseek/deepseek-v4.1-flash-1017'};
  assert.equal(reportedTiming({data: {...metadata.data, model: 'deepseek/deepseek-v4.1-flash-20261017'}}, snapshot).resolvedModel, 'deepseek/deepseek-v4.1-flash-20261017');
  for (const model of ['deepseek/deepseek-v4.1-flash-20261018', 'deepseek/deepseek-v4.1-pro-20261017']) assert.throws(() => reportedTiming({data: {...metadata.data, model}}, snapshot));
});
test('publication needs one verified timing per video and never substitutes an estimate', () => {
  assert.deepEqual(validateTimings(data([entry]), baseline, recovery), data([entry]));
  assert.throws(() => validateTimings(data([]), baseline, recovery));
  assert.throws(() => validateTimings(data([entry, entry]), baseline, recovery));
  assert.throws(() => validateTimings(data([{...entry, video: 'unknown'}]), baseline, recovery));
  assert.throws(() => validateTimings(data([{...entry, model: 'unknown'}]), baseline, recovery));
  assert.throws(() => validateTimings(data([{...entry, generationTimeMs: null}]), baseline, recovery));
  const unavailable = {...entry, generationTimeMs: null, unavailableReason: 'Not reported'};
  assert.equal(validateTimings(data([unavailable]), baseline, recovery).entries[0].generationTimeMs, null);
});
