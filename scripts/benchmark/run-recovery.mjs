import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {additionDigestOf, additionResultsFile, atomicJson, digest as baseDigest, ensureBudget, hash, loadAddition, priceCeiling, protocol, reserveCost, root} from './protocol.mjs';
import {jobId, recoveryHashOf, recoveryProtocol, repairContract, repairFeedback, repairSource} from './recovery.mjs';
import {renderRecovery} from './render-recovery.mjs';

const {values} = parseArgs({options: {execute: {type: 'boolean'}, store: {type: 'string'}, 'addition-id': {type: 'string'}, 'allow-unlimited-key': {type: 'string'}}});
// --addition-id applies the same R1 protocol to a late addition's failures, in that addition's own store.
const addition = values['addition-id'] ? loadAddition(values['addition-id']) : null;
const digest = addition ? additionDigestOf(addition) : baseDigest;
const recoveryHash = recoveryHashOf(digest);
const models = addition ? addition.models : protocol.models;
const baseline = JSON.parse(fs.readFileSync(addition ? additionResultsFile(addition) : path.join(root, 'src/benchmark/results.json'), 'utf8'));
const jobs = baseline.entries.filter(entry => entry.status === 'failed');
if (!values.execute) {
  console.log(JSON.stringify({protocol: recoveryProtocol, jobs: jobs.map(jobId), paidRequestsSent: 0}, null, 2));
  process.exit(0);
}
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('Set OPENROUTER_API_KEY in the process environment.');
const edition = path.resolve(values.store ?? path.join(root, '.benchmark', protocol.edition));
const store = addition ? path.join(edition, `addition-${addition.id.toLowerCase()}`) : edition;
const baseLedger = JSON.parse(fs.readFileSync(path.join(store, 'ledger.json'), 'utf8'));
ensureBudget(baseLedger, 'repair', 0);
if (baseLedger.protocolHash !== digest) throw new Error('Baseline protocol changed.');
const imageId = execFileSync('docker', ['image', 'inspect', 'cliphouse-benchmark:1', '--format', '{{.Id}}'], {encoding: 'utf8'}).trim();
if (imageId !== baseLedger.imageId) throw new Error('Use the original frozen renderer.');
execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], {stdio: 'pipe'});
const target = path.join(store, 'recovery-r1');
fs.mkdirSync(target, {recursive: true, mode: 0o700});
const ledgerFile = path.join(target, 'ledger.json');
const baselineHash = hash(JSON.stringify(baseline));
const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) :
  {recoveryHash, baselineHash, imageId, charges: [], pending: []};
if (ledger.recoveryHash !== recoveryHash || ledger.baselineHash !== baselineHash || ledger.imageId !== imageId) throw new Error('Recovery protocol, baseline, or renderer changed.');
// An addition's cap covers its generation and repair charges together.
const budget = () => ({charges: [...baseLedger.charges, ...ledger.charges], pending: ledger.pending, ...(typeof ledger.capUsd === 'number' ? {capUsd: ledger.capUsd} : {})});
ensureBudget(budget(), 'repair', 0);
const lock = path.join(store, 'runner.lock');
try { fs.mkdirSync(lock); } catch { throw new Error('Another benchmark process owns runner.lock.'); }
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
const headers = {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'};
async function get(url, init = {}) {
  const response = await fetch(url, {...init, signal: AbortSignal.timeout(900000)});
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(data.error)}`);
  return data;
}
let rendering = Promise.resolve();
function render(dir, attempt) {
  const result = rendering.then(() => renderRecovery(dir, attempt, imageId));
  rendering = result.catch(() => {});
  return result;
}
try {
  const identity = (await get('https://openrouter.ai/api/v1/key', {headers})).data;
  const cap = values['allow-unlimited-key'] === undefined ? null : Number(values['allow-unlimited-key']);
  if (cap !== null) {
    // Operator-approved key without an OpenRouter limit, bounded by a hard cap recorded in the recovery ledger.
    if (!addition || !Number.isFinite(cap) || cap <= 0 || cap > 5) throw new Error('--allow-unlimited-key needs --addition-id and a cap between $0 and $5.');
    if (ledger.capUsd === undefined) Object.assign(ledger, {capUsd: cap, keyPolicy: {limit: identity.limit ?? null, approvedAt: new Date().toISOString(), note: 'Key without an OpenRouter spending limit, approved by the operator. Generation and repair spend together is capped by capUsd.'}});
    ensureBudget(budget(), 'repair', 0);
  } else if (!(identity.limit > 0 && identity.limit <= 40) || identity.limit_reset || !(identity.limit_remaining > 0)) throw new Error('Expected dedicated lifetime $40 key with remaining budget.');
  atomicJson(ledgerFile, ledger);
  atomicJson(path.join(target, 'protocol.json'), {...recoveryProtocol, recoveryHash, baselineHash, imageId});
  const providers = new Map();
  for (const model of models.filter(model => jobs.some(entry => entry.model === model.key))) {
    const pinned = JSON.parse(fs.readFileSync(path.join(store, `provider-${model.key}.json`), 'utf8'));
    const data = await get(`https://openrouter.ai/api/v1/models/${model.id}/endpoints`);
    const endpoint = data.data.endpoints.find(endpoint => endpoint.tag === pinned.tag);
    if (!endpoint || endpoint.max_completion_tokens < recoveryProtocol.maxTokens || !['reasoning', 'max_tokens'].every(param => endpoint.supported_parameters.includes(param))) throw new Error(`${model.id}: pinned endpoint cannot support the recovery protocol.`);
    const provider = {tag: pinned.tag, rates: priceCeiling(endpoint.pricing), snapshot: endpoint};
    providers.set(model.key, provider);
    atomicJson(path.join(target, `provider-${model.key}.json`), provider);
  }
  console.log(`Verified ${jobs.length} failures, original providers, and renderer${cap === null ? `, and $${identity.limit_remaining.toFixed(2)} key balance` : `, with a $${ledger.capUsd} ledger cap`}.`);
  async function execute(original) {
    const id = jobId(original);
    const dir = path.join(target, id);
    const recordFile = path.join(dir, 'record.json');
    if (fs.existsSync(recordFile)) { console.log(`${id}: recovery already recorded.`); return; }
    fs.mkdirSync(dir, {recursive: true, mode: 0o700});
    const model = models.find(model => model.key === original.model);
    const provider = providers.get(original.model);
    const priorRecord = JSON.parse(fs.readFileSync(path.join(store, id, 'record.json'), 'utf8'));
    if (priorRecord.status !== 'failed' || priorRecord.protocolHash !== digest) throw new Error('Original failure record mismatch.');
    const prior = JSON.parse(fs.readFileSync(path.join(store, id, `response-${priorRecord.attempts.length}.json`), 'utf8'));
    let diagnostic = original.error;
    const previousInput = path.join(store, id, `input-${priorRecord.attempts.length}/submission.tsx`);
    if (fs.existsSync(previousInput)) {
      fs.mkdirSync(path.join(dir, 'input-0'), {recursive: true});
      fs.copyFileSync(previousInput, path.join(dir, 'input-0/submission.tsx'));
      const initial = await render(dir, 0);
      if (initial.passed) throw new Error(`${id}: original failure no longer reproduces; investigate without calling the model.`);
      diagnostic = initial.diagnostic;
    }
    const messages = [
      {role: 'system', content: repairContract},
      {role: 'user', content: protocol.briefs.find(brief => brief.id === original.brief).prompt},
      {role: 'assistant', content: prior.choices?.[0]?.message?.content || '(The prior response ended without complete source.)'},
      {role: 'user', content: repairFeedback(diagnostic)},
    ];
    const record = {model: original.model, brief: original.brief, run: original.run, provider: provider.tag,
      recoveryHash, baselineHash, imageId, generatedAt: new Date().toISOString(), attempts: [], status: 'failed'};
    for (let attempt = 1; attempt <= recoveryProtocol.maxAttempts; attempt++) {
      const requestFile = path.join(dir, `request-${attempt}.json`);
      const responseFile = path.join(dir, `response-${attempt}.json`);
      let response, elapsed;
      if (fs.existsSync(responseFile)) {
        response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
        const charge = ledger.charges.find(charge => charge.job === id && charge.attempt === attempt);
        if (!charge || charge.cost !== response.usage?.cost) throw new Error('Saved recovery response has unreconciled cost.');
        elapsed = JSON.parse(fs.readFileSync(path.join(dir, `timing-${attempt}.json`), 'utf8')).elapsed;
      } else {
        if (stopping) throw new Error('Stopped before sending another paid request.');
        if (fs.existsSync(requestFile)) throw new Error('Unresolved previous request. Reconcile it before retrying.');
        const reservation = reserveCost(messages, provider.rates, recoveryProtocol.maxTokens);
        ensureBudget(budget(), 'repair', reservation, {allowInFlight: true});
        const request = {model: model.id, messages, max_tokens: recoveryProtocol.maxTokens, reasoning: {effort: model.reasoning},
          provider: {only: [provider.tag], allow_fallbacks: false, require_parameters: true,
            max_price: {prompt: provider.rates.prompt * 1e6, completion: provider.rates.completion * 1e6}}};
        atomicJson(requestFile, request);
        ledger.pending.push({job: id, attempt, kind: 'repair', reservation, startedAt: new Date().toISOString()});
        atomicJson(ledgerFile, ledger);
        const started = Date.now();
        try { response = await get('https://openrouter.ai/api/v1/chat/completions', {method: 'POST', headers, body: JSON.stringify(request)}); }
        catch (error) {
          atomicJson(path.join(dir, `transport-error-${attempt}.json`), {message: error.message});
          throw error;
        }
        elapsed = Date.now() - started;
        atomicJson(responseFile, response);
        atomicJson(path.join(dir, `timing-${attempt}.json`), {elapsed});
        const cost = response.usage?.cost;
        if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) throw new Error('Missing trustworthy cost; reconcile before continuing.');
        ledger.charges.push({job: id, attempt, kind: 'repair', cost, generationId: response.id});
        ledger.pending = ledger.pending.filter(item => item.job !== id || item.attempt !== attempt);
        atomicJson(ledgerFile, ledger);
        if (cost > reservation + 0.00001) throw new Error('Charge exceeded reservation.');
      }
      if (response.model && response.model !== model.id && !response.model.startsWith(`${model.id}-`)) throw new Error('Response model differs from requested model.');
      const usage = {attempt, costUsd: response.usage.cost, generationMs: elapsed, renderMs: 0};
      record.attempts.push(usage);
      let source;
      try {
        if (response.choices?.[0]?.finish_reason === 'length') throw new Error('Completion limit reached; return the entire module more concisely.');
        source = repairSource(response.choices?.[0]?.message?.content ?? '');
      } catch (error) { diagnostic = `Invalid submission: ${error.message}`; }
      if (source) {
        fs.mkdirSync(path.join(dir, `input-${attempt}`), {recursive: true});
        fs.writeFileSync(path.join(dir, `input-${attempt}/submission.tsx`), source);
        usage.sourceHash = hash(source);
        const rendered = await render(dir, attempt);
        usage.renderMs = rendered.ms;
        if (rendered.passed) {
          record.status = 'rendered';
          record.successfulAttempt = attempt;
          break;
        }
        diagnostic = rendered.diagnostic;
      }
      record.error = diagnostic;
      messages.push({role: 'assistant', content: response.choices?.[0]?.message?.content || '(No complete source returned.)'},
        {role: 'user', content: repairFeedback(diagnostic)});
    }
    if (record.status === 'rendered') delete record.error;
    atomicJson(recordFile, record);
    console.log(`${id}: ${record.status}, ${record.attempts.length} additional attempt(s), $${record.attempts.reduce((sum, attempt) => sum + attempt.costUsd, 0).toFixed(4)}`);
  }
  let next = 0;
  const errors = [];
  await Promise.all(Array.from({length: 4}, async () => {
    while (!stopping && next < jobs.length) {
      const job = jobs[next++];
      try { await execute(job); }
      catch (error) { stopping = true; errors.push(error); console.error(`${jobId(job)}: ${error.message}. Draining active jobs.`); }
    }
  }));
  if (errors.length) throw errors[0];
  console.log(`Recovery finished. Additional API cost: $${ledger.charges.reduce((sum, charge) => sum + charge.cost, 0).toFixed(4)}.`);
} finally {
  fs.rmdirSync(lock);
}
