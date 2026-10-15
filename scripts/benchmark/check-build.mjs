import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {additionResultsFile, laterAdditions, loadAdditionResults, root, validateAddition, validateResults} from './protocol.mjs';
import {validateRecovery} from './recovery.mjs';
import {validateTimings} from './timings.mjs';

const dist = path.join(root, 'dist');
const expected = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/results.json'), 'utf8'));
const published = validateResults(JSON.parse(fs.readFileSync(path.join(dist, 'benchmark/results.json'), 'utf8')), dist);
assert.deepEqual(published, expected, 'The production build must contain every recorded result.');
const {addition: _addition, additionHash: _hash, ...additionsPublished} = JSON.parse(fs.readFileSync(path.join(dist, 'benchmark/addition-results.json'), 'utf8'));
assert.deepEqual(validateAddition(additionsPublished, published, dist), JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/addition-results.json'), 'utf8')), 'Every addition result must be published.');
for (const item of laterAdditions) {
  const file = additionResultsFile(item);
  if (!fs.existsSync(file)) continue;
  const {addition: _a, additionHash: _h, ...data} = JSON.parse(fs.readFileSync(path.join(dist, `benchmark/${path.basename(file)}`), 'utf8'));
  assert.deepEqual(validateAddition(data, published, dist, item), JSON.parse(fs.readFileSync(file, 'utf8')), `Every ${item.id} result must be published.`);
}
const additions = loadAdditionResults(published, dist);
const recovery = validateRecovery(JSON.parse(fs.readFileSync(path.join(dist, 'benchmark/recovery.json'), 'utf8')), published, dist);
assert.deepEqual(recovery, JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/recovery.json'), 'utf8')), 'Every recovery must be published.');
const timings = validateTimings(JSON.parse(fs.readFileSync(path.join(dist, 'benchmark/timings.json'), 'utf8')), published, recovery, dist, additions);
assert.deepEqual(timings, JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/timings.json'), 'utf8')), 'Every video must have its OpenRouter timing record.');
for (const route of ['benchmark/index.html', `benchmark/${published.edition}/index.html`]) {
  const html = fs.readFileSync(path.join(dist, route), 'utf8');
  assert.match(html, /Motion Graphics/, `${route} must include the benchmark article.`);
  assert.match(html, /benchmark-card/, `${route} must contain prerendered results.`);
}
console.log(`Production build contains both benchmark pages and all ${published.entries.length} recorded results and ${additions.entries.length} addition results with their media.`);
for (const file of fs.readdirSync(dist, {recursive: true}).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const [tag] of html.matchAll(/<video\b[^>]*>/g)) {
    assert.doesNotMatch(tag, /\ssrc=/, `${file}: videos must not fetch before viewport observation.`);
    assert.match(tag, /data-video-src=/, `${file}: videos must use the shared loading policy.`);
    assert.match(tag, /preload="none"/, `${file}: videos must not preload.`);
  }
}
console.log('Every prerendered video defers its source until viewport observation.');
