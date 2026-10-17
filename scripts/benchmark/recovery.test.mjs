import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {repairSource, repairFeedback, recoveryHash, recoveryHashOf, recoveryProtocol, validateRecovery} from './recovery.mjs';
import {additionDigestOf, ensureBudget, loadAddition} from './protocol.mjs';

const source = 'import React from "react";\nexport const BenchmarkVideo = () => <div>Hello</div>;';
test('recovery unwraps transport formats without editing generated code', () => {
  assert.equal(repairSource(source), source);
  assert.equal(repairSource(`\`\`\`tsx\n${source}\n\`\`\``), source);
  assert.equal(repairSource(JSON.stringify({source})), source);
  assert.throws(() => repairSource(`\`\`\`tsx\n${source}\n\`\`\`\nMore prose`));
  assert.throws(() => repairSource('{"source":"broken'));
});
test('all failures receive the same bounded recovery protocol', () => {
  assert.equal(recoveryProtocol.maxAttempts, 3);
  assert.equal(recoveryProtocol.maxTokens, 64000);
  assert.match(repairFeedback('Type error'), /Type error/);
  assert.match(repairFeedback('Type error'), /without changing the brief/);
});
test('recovery budget includes baseline repair spending and in-flight reservations', () => {
  assert.throws(() => ensureBudget({charges: [{kind: 'repair', cost: 9.5}], pending: [{kind: 'repair', reservation: 0.4}]}, 'repair', 0.2, {allowInFlight: true}));
});
test('recoveries cannot replace successful baselines or repeat a failure', () => {
  const entry = {model: 'qwen-3-8', brief: 'kinetic-type', run: 1, status: 'failed', attempts: 3,
    provider: 'test', generatedAt: '2026-10-08T17:00:00.000Z', costUsd: 0.1, generationMs: 100, renderMs: 100,
    request: 'benchmark/media/recovery-r1-qwen-3-8-kinetic-type-1/request.json', error: 'Failed'};
  assert.throws(() => validateRecovery({version: 'R1', entries: [entry]}, {entries: [{...entry, status: 'rendered'}]}));
  assert.throws(() => validateRecovery({version: 'R1', entries: [entry, entry]}, {entries: [entry]}));
  assert.equal(validateRecovery({version: 'R1', entries: [entry]}, {entries: [entry]}).entries.length, 1);
});
test('late additions reuse R1 bound to their own protocol hash and model list', () => {
  const a3 = loadAddition('A3');
  assert.notEqual(recoveryHashOf(additionDigestOf(a3)), recoveryHash);
  const entry = {model: 'deepseek-v4-1-flash-1017', brief: 'kinetic-type', run: 1, status: 'failed', attempts: 3,
    provider: 'deepseek', generatedAt: '2026-10-17T17:00:00.000Z', costUsd: 0.01, generationMs: 100, renderMs: 100,
    request: 'benchmark/media/recovery-r1-deepseek-v4-1-flash-1017-kinetic-type-1/request.json', error: 'Failed', note: 'Fenced JSON.'};
  const failed = entry;
  assert.throws(() => validateRecovery({version: 'R1', entries: [entry]}, {entries: [failed]}), 'edition models reject addition repairs');
  assert.equal(validateRecovery({version: 'R1', entries: [entry]}, {entries: [failed]}, undefined, a3.models).entries[0].note, 'Fenced JSON.');
  const plan = JSON.parse(execFileSync(process.execPath, ['scripts/benchmark/run-recovery.mjs', '--addition-id', 'A3'], {encoding: 'utf8', env: {...process.env, OPENROUTER_API_KEY: ''}}));
  assert.equal(plan.paidRequestsSent, 0);
  assert.ok(plan.jobs.length === 5 && plan.jobs.every((job) => job.startsWith('deepseek-v4-1-flash-1017-')));
});
