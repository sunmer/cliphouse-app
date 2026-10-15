import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {additionDigestOf, additionResultsFile, atomicJson, hash, loadAddition, protocol, root, validateAddition, validateResults} from './protocol.mjs';

const {values} = parseArgs({options: {id: {type: 'string'}}});
const addition = loadAddition(values.id ?? 'A1');
const additionDigest = additionDigestOf(addition);

// Publishes late-added models separately. src/benchmark/results.json stays unchanged.
const store = path.join(root, '.benchmark', protocol.edition, `addition-${addition.id.toLowerCase()}`);
if (fs.existsSync(path.join(store, 'runner.lock'))) throw new Error('Wait for the active runner before publishing.');
const ledger = JSON.parse(fs.readFileSync(path.join(store, 'ledger.json'), 'utf8'));
if (ledger.pending?.length) throw new Error('Unresolved API cost. Reconcile before publishing.');
if (ledger.protocolHash !== additionDigest) throw new Error('Addition protocol changed.');
const baseline = validateResults(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/results.json'), 'utf8')));
const entries = [];
for (const model of addition.models) for (const brief of protocol.briefs) for (let run = 1; run <= protocol.runs; run++) {
  const id = `${model.key}-${brief.id}-${run}`;
  const dir = path.join(store, id);
  if (!fs.existsSync(path.join(dir, 'record.json'))) continue;
  const record = JSON.parse(fs.readFileSync(path.join(dir, 'record.json'), 'utf8'));
  if (record.protocolHash !== additionDigest || record.imageId !== ledger.imageId) throw new Error(`Addition record mismatch: ${id}`);
  const costs = ledger.charges.filter((charge) => charge.job === id);
  if (costs.length !== record.attempts.length || record.attempts.some((attempt) => !costs.some((charge) => charge.attempt === attempt.attempt && charge.cost === attempt.costUsd))) throw new Error(`Ledger mismatch for ${id}.`);
  const prefix = `benchmark/media/addition-${addition.id.toLowerCase()}-${id}`;
  const destination = path.join(root, 'public', prefix);
  const published = {
    model: record.model, brief: record.brief, run: record.run, status: record.status,
    attempts: record.attempts.length, firstAttemptPassed: record.status === 'rendered' && record.attempts.length === 1,
    provider: record.provider, generatedAt: record.generatedAt, costUsd: costs.reduce((sum, charge) => sum + charge.cost, 0),
    generationMs: record.attempts.reduce((sum, attempt) => sum + attempt.generationMs, 0),
    renderMs: record.attempts.reduce((sum, attempt) => sum + attempt.renderMs, 0), reviews: [],
  };
  fs.mkdirSync(destination, {recursive: true});
  const requests = record.attempts.map((attempt) => JSON.parse(fs.readFileSync(path.join(dir, `request-${attempt.attempt}.json`), 'utf8')));
  atomicJson(path.join(destination, 'request.json'), {addition, additionHash: additionDigest, imageId: record.imageId, requests});
  published.request = `${prefix}/request.json`;
  if (record.status === 'rendered') {
    const source = path.join(dir, `input-${record.successfulAttempt}/submission.tsx`);
    if (hash(fs.readFileSync(source)) !== record.attempts.at(-1).sourceHash) throw new Error(`Source changed after generation: ${id}`);
    for (const name of ['video.mp4', 'poster.jpg']) {
      const artifact = path.join(dir, `render-${record.successfulAttempt}`, name);
      if (!fs.lstatSync(artifact).isFile() || !fs.statSync(artifact).size) throw new Error(`Missing or unsafe output: ${id}/${name}`);
      fs.copyFileSync(artifact, path.join(destination, name));
    }
    fs.copyFileSync(source, path.join(destination, 'source.tsx'));
    Object.assign(published, {video: `${prefix}/video.mp4`, poster: `${prefix}/poster.jpg`, source: `${prefix}/source.tsx`});
  } else published.error = record.error?.slice(0, 1000) ?? 'The submission did not render.';
  entries.push(published);
}
const updatedAt = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Stockholm'}).format(new Date());
const data = validateAddition({id: addition.id, edition: addition.edition, updatedAt, entries}, baseline, path.join(root, 'public'), addition);
atomicJson(additionResultsFile(addition), data);
console.log(`Prepared ${entries.length} addition results, ${entries.filter((entry) => entry.status === 'rendered').length} videos, $${entries.reduce((sum, entry) => sum + entry.costUsd, 0).toFixed(4)}. Original results unchanged.`);
