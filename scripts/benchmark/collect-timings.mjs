import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {additionResultsFile, atomicJson, hash, loadAddition, loadAdditionResults, protocol, root, validateResults} from './protocol.mjs';
import {loadAdditionRecoveries} from './recovery.mjs';
import {reportedTiming, validateTimings} from './timings.mjs';

const {values} = parseArgs({options: {execute: {type: 'boolean'}, store: {type: 'string'}}});
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/results.json'), 'utf8'));
const recovery = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/recovery.json'), 'utf8'));
const additions = loadAdditionResults(validateResults(baseline));
const additionRecoveries = loadAdditionRecoveries(undefined, loadAddition, additionResultsFile);
const store = path.resolve(values.store ?? path.join(root, '.benchmark', protocol.edition));
const jobs = [
  ...baseline.entries.filter(entry => entry.status === 'rendered').map(entry => ({entry, directory: store})),
  ...recovery.entries.filter(entry => entry.status === 'rendered').map(entry => ({entry, directory: path.join(store, 'recovery-r1')})),
  ...additions.entries.filter(entry => entry.status === 'rendered').map(entry => ({entry, directory: path.join(store, `addition-${entry.addition.toLowerCase()}`)})),
  ...additionRecoveries.filter(entry => entry.status === 'rendered').map(entry => ({entry, directory: path.join(store, `addition-${entry.addition.toLowerCase()}`, 'recovery-r1')})),
];
if (!values.execute) {
  console.log(`Read-only timing lookup for ${jobs.length} successful video generations. Use --execute and OPENROUTER_API_KEY. No completions or renders will be requested.`);
  process.exit(0);
}
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('Set OPENROUTER_API_KEY in the process environment.');
if (fs.existsSync(path.join(store, 'runner.lock'))) throw new Error('Wait for the benchmark runner before collecting timings.');
const headers = {Authorization: `Bearer ${key}`};
const auth = await fetch('https://openrouter.ai/api/v1/key', {headers, signal: AbortSignal.timeout(30000)});
if (!auth.ok) throw new Error(`OpenRouter key validation failed: HTTP ${auth.status}.`);
const entries = [];
for (const {entry, directory} of jobs) {
  const id = `${entry.model}-${entry.brief}-${entry.run}`;
  const run = path.join(directory, id);
  const record = JSON.parse(fs.readFileSync(path.join(run, 'record.json'), 'utf8'));
  const attempt = record.attempts.find(attempt => attempt.attempt === record.successfulAttempt);
  if (record.status !== 'rendered' || !attempt) throw new Error(`No successful attempt for ${id}.`);
  const response = JSON.parse(fs.readFileSync(path.join(run, `response-${attempt.attempt}.json`), 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(path.join(directory, 'ledger.json'), 'utf8'));
  if (!ledger.charges.some(charge => charge.job === id && charge.attempt === attempt.attempt && charge.generationId === response.id)) throw new Error(`Generation ID does not match ledger: ${id}.`);
  if (!/^gen-[0-9A-Za-z-]+$/.test(response.id)) throw new Error('Invalid generation ID.');
  const sourceSha256 = hash(fs.readFileSync(path.join(run, `input-${attempt.attempt}/submission.tsx`)));
  if (sourceSha256 !== attempt.sourceHash || sourceSha256 !== hash(fs.readFileSync(path.join(root, 'public', entry.source)))) throw new Error(`Successful source differs from video source: ${id}.`);
  const cache = path.join(store, 'openrouter-timings', `${response.id}.json`);
  let saved;
  if (fs.existsSync(cache)) saved = JSON.parse(fs.readFileSync(cache, 'utf8'));
  else {
    const result = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(response.id)}`, {headers, signal: AbortSignal.timeout(30000)});
    if (!result.ok && result.status !== 404) throw new Error(`Timing lookup failed for ${id}: HTTP ${result.status}. No estimated timing will be published.`);
    saved = {fetchedAt: new Date().toISOString(), status: result.status, metadata: result.ok ? await result.json() : null};
    // Cache only successful lookups so unavailable records can be retried later.
    if (result.ok) atomicJson(cache, saved);
  }
  const timing = saved.status === 404
    ? {generationId: response.id, model: response.model, resolvedModel: response.model, provider: response.provider ?? null, generationTimeMs: null, unavailableReason: 'OpenRouter could not find this generation.'}
    : reportedTiming(saved.metadata, response);
  entries.push({video: entry.video, sourceSha256, ...timing, fetchedAt: saved.fetchedAt});
  console.log(`${id}: ${timing.generationTimeMs === null ? 'unavailable' : `${timing.generationTimeMs} ms`}`);
}
const data = validateTimings({version: 1, metric: 'generation_time', unit: 'milliseconds', entries}, baseline, recovery, path.join(root, 'public'), {entries: [...additions.entries, ...additionRecoveries]});
atomicJson(path.join(root, 'src/benchmark/timings.json'), data);
console.log(`Published OpenRouter timing records for ${entries.length} videos; ${entries.filter(entry => entry.generationTimeMs !== null).length} available. No generation calls made.`);
