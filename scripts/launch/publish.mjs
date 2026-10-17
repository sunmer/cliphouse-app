// Publish approved pilot candidates: apply each candidate, mark its refresh brief approved, then regenerate the
// scaffold, catalog entry, preview, poster, and a new immutable source version. Run only after review.
// Usage: node --import tsx scripts/launch/publish.mjs <id> [...]
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {approveRefresh, REFRESH} from './refresh.mjs';
import {LAUNCH} from './briefs.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2);
if (!ids.length) throw new Error('Name the approved pilot ids, for example: publish.mjs changelog migration');
const pilot = path.join(root, 'output/launch/pilot');
const pilotStatus = JSON.parse(fs.readFileSync(path.join(pilot, 'status.json'), 'utf8'));
for (const id of ids) {
  if (!REFRESH[id]) throw new Error(`${id} has no refresh brief.`);
  if (pilotStatus[id]?.state !== 'ready') throw new Error(`${id} is not a ready pilot candidate (state: ${pilotStatus[id]?.state ?? 'none'}).`);
  for (const f of ['candidate/score.json', 'candidate/index.html', 'published-meta.ts', 'meta.json'])
    if (!fs.existsSync(path.join(pilot, id, f))) throw new Error(`${id}: missing ${f}`);
}
const run = (args) => execFileSync(process.execPath, args, {cwd: root, stdio: 'inherit'});
for (const id of ids) {
  const from = path.join(pilot, id);
  fs.copyFileSync(path.join(from, 'candidate/score.json'), path.join(root, 'src/videos', id, 'score.json'));
  fs.copyFileSync(path.join(from, 'candidate/index.html'), path.join(root, 'src/hyperframes', id, 'index.html'));
  fs.copyFileSync(path.join(from, 'published-meta.ts'), path.join(root, 'src/videos', id, 'meta.ts'));
  // The scaffold reads the design (poster frame, motion) from output/launch/<id>/meta.json.
  fs.mkdirSync(path.join(root, 'output/launch', id), {recursive: true});
  fs.copyFileSync(path.join(from, 'meta.json'), path.join(root, 'output/launch', id, 'meta.json'));
}
approveRefresh(ids);
// Import after approval, so the catalog entries take the refresh brief and theme.
const {entries} = await import('./catalog.mjs');
const manifestFile = path.join(root, 'src/catalog/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
// Only the approved entries change. Other launch templates, goals, and hidden flags stay as they are.
for (const id of ids) {
  const {template, variant} = entries(LAUNCH.find((b) => b.id === id));
  const t = manifest.templates.findIndex((x) => x.id === id);
  const v = manifest.variants.findIndex((x) => x.id === variant.id);
  if (t < 0 || v < 0) throw new Error(`${id} is not in the manifest.`);
  manifest.templates[t] = {...manifest.templates[t], prompt: template.prompt};
  const old = manifest.variants[v];
  // Keep the published track: only text and theme come from the refresh.
  manifest.variants[v] = {...old, description: variant.description, props: {...variant.props, audio: old.props.audio}, ...(old.goals ? {goals: old.goals} : {})};
}
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
run(['scripts/launch/scaffold.mjs']);
run(['--import', 'tsx', 'scripts/hyperframes-previews.mjs', ...ids.map((id) => `${id}-launch`)]);
run(['scripts/build-sources.mjs']);
console.log(`Published ${ids.join(', ')}. Review the diff, run the checks, then commit.`);
