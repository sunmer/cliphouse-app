// Unattended conversion of templates to the beat contract.
// For each template: Opus plan, apply presets, checks, up to REPAIRS repair rounds, beat sheets,
// one Opus visual review, checks again. The result is "ready" for the user's watch-and-listen review, or "failed".
// Usage: node scripts/beat/pipeline.mjs <template ...>     (CONCURRENCY=3 REPAIRS=3)
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2);
const CONCURRENCY = Number(process.env.CONCURRENCY || 3);
const REPAIRS = Number(process.env.REPAIRS || 3);
const statusFile = path.join(root, 'output/beat-convert/status.json');
fs.mkdirSync(path.dirname(statusFile), {recursive: true});
const status = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : {};
const save = () => fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
const node = (args, opts = {}) => run(process.execPath, args, {cwd: root, maxBuffer: 64 * 1024 * 1024, ...opts});

// Applying a candidate and checking it touch the shared tree (type check, manifest, gates), so they run
// one template at a time. Opus calls run in parallel.
let treeLock = Promise.resolve();
const exclusive = (fn) => { const next = treeLock.then(fn, fn); treeLock = next.catch(() => {}); return next; };

/** Copy the candidate files into the template and its presets into the manifest. */
function apply(id) {
  const cand = path.join(root, 'output/beat-convert', id, 'candidate');
  const vdir = path.join(root, 'src/videos', id);
  for (const f of fs.readdirSync(cand)) {
    if (f === 'presets.json') continue;
    if (f === 'index.html') { fs.copyFileSync(path.join(cand, f), path.join(root, 'src/hyperframes', id, 'index.html')); continue; }
    // A renamed component replaces the old one: a template keeps exactly one .tsx file.
    if (f.endsWith('.tsx')) for (const old of fs.readdirSync(vdir).filter((x) => x.endsWith('.tsx') && x !== f)) fs.rmSync(path.join(vdir, old));
    fs.copyFileSync(path.join(cand, f), path.join(vdir, f));
  }
  for (const old of ['direction.json']) fs.rmSync(path.join(vdir, old), {force: true});
  const p = path.join(root, 'src/catalog/manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const presets = JSON.parse(fs.readFileSync(path.join(root, 'output/beat-convert', id, 'presets.json'), 'utf8'));
  for (const v of m.variants.filter((x) => x.template === id)) if (presets[v.id]) v.props = presets[v.id];
  m.templates.find((x) => x.id === id).music = true;
  fs.writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

// The template's files before conversion, so a failed conversion leaves the tree as it found it.
function snapshot(id) {
  const vdir = path.join(root, 'src/videos', id);
  const hf = path.join(root, 'src/hyperframes', id, 'index.html');
  const files = Object.fromEntries(fs.readdirSync(vdir).filter((f) => fs.statSync(path.join(vdir, f)).isFile()).map((f) => [f, fs.readFileSync(path.join(vdir, f))]));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'));
  return {files, html: fs.existsSync(hf) ? fs.readFileSync(hf) : null,
    variants: m.variants.filter((v) => v.template === id).map((v) => [v.id, v.props]), music: m.templates.find((t) => t.id === id).music};
}
function restore(id, snap) {
  const vdir = path.join(root, 'src/videos', id);
  for (const f of fs.readdirSync(vdir)) if (fs.statSync(path.join(vdir, f)).isFile() && !(f in snap.files)) fs.rmSync(path.join(vdir, f));
  for (const [f, data] of Object.entries(snap.files)) fs.writeFileSync(path.join(vdir, f), data);
  if (snap.html) fs.writeFileSync(path.join(root, 'src/hyperframes', id, 'index.html'), snap.html);
  const p = path.join(root, 'src/catalog/manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [vid, props] of snap.variants) m.variants.find((v) => v.id === vid).props = props;
  const t = m.templates.find((x) => x.id === id);
  if (snap.music) t.music = snap.music; else delete t.music;
  fs.writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

// Checks that need no model call. Returns the error text, or '' when everything passes.
async function check(id, sheets) {
  const errors = [];
  try { await run(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit'], {cwd: root, maxBuffer: 16 * 1024 * 1024}); }
  catch (e) { errors.push(`TypeScript:\n${String(e.stdout).split('\n').filter((l) => l.includes(`/${id}/`) || l.includes(`${id}.`) || l.includes('manifest')).slice(0, 40).join('\n') || String(e.stdout).slice(0, 4000)}`); }
  if (errors.length) return errors.join('\n\n');
  try {
    await node(['--import', 'tsx', '--input-type=module', '-e', `
      const {templateMeta} = await import('./src/videos/meta.ts');
      const {scoreOf} = await import('./src/videos/beat/schema.ts');
      const {scoreErrors} = await import('./src/videos/beat/check.ts');
      const {countErrors, beatAudioErrors, renderCount} = await import('./scripts/beat-gates.ts');
      const {schemas} = await import('./src/videos/schemas.ts');
      const {validateProps} = await import('./src/agent/handoff.ts');
      const {likeness} = await import('./src/videos/beat/variety.ts');
      const manifest = (await import('./src/catalog/manifest.json', {with: {type: 'json'}})).default;
      const id = ${JSON.stringify(id)};
      const s = scoreOf(templateMeta[id]);
      const e = [];
      if (!s) e.push('meta.ts does not carry a beat score (use beatMeta)');
      else {
        e.push(...scoreErrors(s).map((x) => 'score: ' + x));
        e.push(...countErrors(s));
        for (const v of manifest.variants.filter((x) => x.template === id)) {
          const r = validateProps(schemas[id], v.props);
          if (!r.ok) e.push('preset ' + v.id + ': ' + r.error);
          if (s.list && v.props.texts.list?.split('\\n').length !== s.list.max) e.push('preset ' + v.id + ': list must have list.max items');
        }
        if (s.list) for (let n = s.list.min; n <= s.list.max; n++) e.push(...beatAudioErrors(s, renderCount(s, n), n).map((x) => 'audio ' + n + ' items: ' + x));
        for (const [k, m] of Object.entries(templateMeta)) { const o = scoreOf(m); if (o && k !== id && likeness(s, o) >= 5) e.push('sound: shares ' + likeness(s, o) + ' of 7 traits with ' + k + '; change tempo, genre, key, groove, or timbre'); }
      }
      if (e.length) { console.log(e.join('\\n')); process.exit(1); }`]);
  } catch (e) { return `Contract:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  try { await node(['--import', 'tsx', 'scripts/beat-direction.mjs', '--sheets', sheets, id], {timeout: 900_000}); }
  catch (e) { return `Direction gates:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  return '';
}

async function convert(id) {
  const dir = path.join(root, 'output/beat-convert', id);
  fs.mkdirSync(dir, {recursive: true});
  const sheets = path.join(dir, 'gates');
  const s = status[id] = {state: 'converting', rounds: [], startedAt: new Date().toISOString()};
  save();
  const opus = async (step) => {
    const {stdout} = await node(['scripts/beat/convert.mjs', id, step], {timeout: 2_400_000});
    s.rounds.push(JSON.parse(stdout.trim().split('\n').at(-1)));
    save();
  };
  const snap = snapshot(id);
  // A candidate that fails is taken back out before the lock is released, so others always check a clean tree.
  const applyAndCheck = () => exclusive(async () => {
    apply(id);
    const errors = await check(id, sheets);
    if (errors) restore(id, snap);
    return errors;
  });
  try {
    await opus('plan');
    let errors = await applyAndCheck();
    for (let k = 0; errors && k < REPAIRS; k++) {
      fs.writeFileSync(path.join(dir, 'errors.txt'), errors);
      await opus('repair');
      errors = await applyAndCheck();
    }
    if (errors) throw new Error(errors);
    // One visual review round on the passing render.
    fs.rmSync(path.join(dir, 'sheets'), {recursive: true, force: true});
    fs.cpSync(path.join(sheets, id), path.join(dir, 'sheets'), {recursive: true});
    await opus('review');
    errors = await applyAndCheck();
    for (let k = 0; errors && k < REPAIRS; k++) {
      fs.writeFileSync(path.join(dir, 'errors.txt'), errors);
      await opus('repair');
      errors = await applyAndCheck();
    }
    if (errors) throw new Error(errors);
    s.state = 'ready';
  } catch (e) {
    s.state = 'failed';
    s.error = String(e.message ?? e).slice(0, 4000);
  }
  s.cost = Math.round(s.rounds.reduce((n, r) => n + (r.cost ?? 0), 0) * 100) / 100;
  s.finishedAt = new Date().toISOString();
  save();
  console.log(`${s.state.padEnd(6)} ${id} $${s.cost} ${s.rounds.length} rounds${s.error ? `\n  ${s.error.split('\n').slice(0, 6).join('\n  ')}` : ''}`);
}

// Type checks and gates read the whole repository, so conversions run in parallel but checks see others' work.
const queue = [...ids];
await Promise.all(Array.from({length: Math.min(CONCURRENCY, queue.length)}, async () => { while (queue.length) await convert(queue.shift()); }));
