// Unattended generation of the launch set. For each template: plan, apply, checks, up to REPAIRS repair
// rounds, beat sheets, one Opus visual review (always), and the checks again. Opus calls run in parallel;
// applying and checking touch the shared tree, so they run one template at a time under a lock.
// The result is "ready" for the user's review, or "failed" with the last errors.
// PUBLISH=0 is candidate-only: each check runs on the applied candidate, then the source files are restored,
// and previews land in LAUNCH_OUTPUT/<id>/ instead of public/. scripts/launch/pilot.mjs uses it.
// Usage: node scripts/launch/pipeline.mjs [id ...]   (CONCURRENCY=4 REPAIRS=3 REVIEW=1 RESUME=0 PUBLISH=1)
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';
import {LAUNCH} from './briefs.mjs';
import os from 'node:os';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : LAUNCH.map((b) => b.id);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const REPAIRS = Number(process.env.REPAIRS || 3);
const REVIEW = process.env.REVIEW !== '0';
const PUBLISH = process.env.PUBLISH !== '0';
const OUT = process.env.LAUNCH_OUTPUT || 'output/launch';
// RESUME=1 resumes every template from its last candidate; RESUME_IDS=a,b resumes only those.
const resumed = (id) => process.env.RESUME === '1' || (process.env.RESUME_IDS ?? '').split(',').includes(id);
const statusFile = path.join(root, OUT, 'status.json');
fs.mkdirSync(path.dirname(statusFile), {recursive: true});
const prior = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : {};
const status = {};
// Several pipelines may run at once: each writes only its own templates into the shared file.
const save = () => {
  const disk = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : {};
  fs.writeFileSync(statusFile, JSON.stringify({...disk, ...status}, null, 2));
};
const node = (args, opts = {}) => run(process.execPath, args, {cwd: root, maxBuffer: 64 * 1024 * 1024, ...opts});

let treeLock = Promise.resolve();
const exclusive = (fn) => { const next = treeLock.then(fn, fn); treeLock = next.catch(() => {}); return next; };
// Candidate-only runs restore every applied candidate if the run is stopped mid-check.
const applied = new Map();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (!PUBLISH) for (const [id, snap] of applied) restore(id, snap);
  process.exit(130);
});

// meta.ts is rewritten by the scaffold from the candidate's design, so it is restored with the other two.
const files = (id) => ({score: path.join(root, 'src/videos', id, 'score.json'), html: path.join(root, 'src/hyperframes', id, 'index.html'), meta: path.join(root, 'src/videos', id, 'meta.ts')});
function snapshot(id) { return Object.fromEntries(Object.entries(files(id)).map(([k, f]) => [k, fs.readFileSync(f)])); }
function restore(id, snap) { for (const [k, f] of Object.entries(files(id))) fs.writeFileSync(f, snap[k]); }
function apply(id) {
  const cand = path.join(root, OUT, id, 'candidate');
  const f = files(id);
  fs.copyFileSync(path.join(cand, 'score.json'), f.score);
  fs.copyFileSync(path.join(cand, 'index.html'), f.html);
}

// Checks that need no model call. Returns the error text, or '' when everything passes.
async function check(id, sheets) {
  try { await node(['scripts/launch/scaffold.mjs'], PUBLISH ? {} : {env: {...process.env, SCAFFOLD_ONLY: id}}); } catch (e) { return `Scaffold:\n${String(e.stderr || e.message).slice(0, 2000)}`; }
  try { await run(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit'], {cwd: root, maxBuffer: 16 * 1024 * 1024}); }
  catch (e) { return `TypeScript:\n${String(e.stdout).split('\n').filter((l) => l.includes(`/${id}/`)).slice(0, 40).join('\n') || String(e.stdout).slice(0, 4000)}`; }
  try {
    await node(['--import', 'tsx', 'scripts/launch/contract.mjs', id]);
  } catch (e) { return `Contract:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  try { await node(['--import', 'tsx', 'scripts/beat-direction.mjs', '--sheets', sheets, id], {timeout: 1_200_000}); }
  catch (e) { return `Direction gates:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  // Exports render with `hyperframes render --strict`, so its lint errors must fail here too.
  const lint = await hyperframesLint(id);
  if (lint) return `HyperFrames lint (exports render with --strict):\n${lint}`;
  return '';
}

async function hyperframesLint(id) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cliphouse-lint-${id}-`));
  try {
    await node(['--import', 'tsx', '-e', `
      const {writeHyperframesProject} = await import('./server/hyperframes.ts');
      const {templateMeta} = await import('./src/videos/meta.ts');
      const {LAUNCH} = await import('./scripts/launch/briefs.mjs');
      const {presetProps} = await import('./scripts/launch/catalog.mjs');
      const b = LAUNCH.find((x) => x.id === ${JSON.stringify(id)});
      await writeHyperframesProject({template: b.id, props: presetProps(b), meta: templateMeta[b.id]}, ${JSON.stringify(dir)});`]);
    let out = '';
    try { ({stdout: out} = await run(path.join(root, 'node_modules/.bin/hyperframes'), ['lint', dir], {cwd: root, maxBuffer: 16 * 1024 * 1024})); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
    const lines = out.split('\n');
    return lines.flatMap((l, i) => (l.includes('✗') ? [l.trim().replace(`${dir}/`, ''), (lines[i + 1] ?? '').trim()] : [])).join('\n').slice(0, 6000);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

async function build(id) {
  const dir = path.join(root, OUT, id);
  fs.mkdirSync(dir, {recursive: true});
  const sheets = path.join(dir, 'gates');
  // Ready templates are left alone. A failed or interrupted one resumes from its candidate when it has one.
  if (prior[id]?.state === 'ready' && process.env.FORCE !== '1') { console.log(`ready  ${id} (kept)`); return; }
  const hasCandidate = fs.existsSync(path.join(dir, 'candidate', 'index.html'));
  const s = status[id] = {state: 'generating', rounds: prior[id]?.rounds ?? [], startedAt: new Date().toISOString()};
  save();
  const opus = async (step) => {
    const {stdout} = await node(['scripts/launch/generate.mjs', id, step], {timeout: 3_600_000});
    const r = JSON.parse(stdout.trim().split('\n').at(-1));
    s.rounds.push(r);
    save();
    if (r.error) throw new Error(`${step}: ${r.error}`);
  };
  const snap = snapshot(id);
  // A failing candidate is taken back out before the lock is released, so others always check a clean tree.
  const applyAndCheck = (finish) => exclusive(async () => {
    apply(id);
    applied.set(id, snap);
    let errors = await check(id, sheets);
    if (!errors && finish) {
      try { await finish(); } catch (e) { errors = `Preview:\n${String(e.stderr || e.message).slice(0, 4000)}`; }
    }
    // Candidate-only runs never leave a candidate in the source tree.
    if (errors || !PUBLISH) restore(id, snap);
    applied.delete(id);
    return errors;
  });
  // In candidate-only runs the passing candidate renders its own preview and poster before it is taken out.
  const preview = PUBLISH ? undefined : () => node(['--import', 'tsx', 'scripts/launch/pilot-preview.mjs', id, dir], {timeout: 1_200_000});
  const repairLoop = async (errors, finish) => {
    for (let k = 0; errors && k < REPAIRS; k++) {
      fs.writeFileSync(path.join(dir, 'errors.txt'), errors);
      await opus('repair');
      errors = await applyAndCheck(finish);
    }
    if (errors) throw new Error(errors);
  };
  try {
    if (!resumed(id) && !hasCandidate) await opus('plan');
    const finish = REVIEW ? undefined : preview;
    await repairLoop(await applyAndCheck(finish), finish);
    if (REVIEW) {
      fs.rmSync(path.join(dir, 'sheets'), {recursive: true, force: true});
      fs.cpSync(path.join(sheets, id), path.join(dir, 'sheets'), {recursive: true});
      // Keep the review payload small: the combined beat sheets only. Single focus frames are dropped.
      for (const f of fs.readdirSync(path.join(dir, 'sheets'))) if (!/^beats-.*\.png$/.test(f)) fs.rmSync(path.join(dir, 'sheets', f));
      await opus('review');
      await repairLoop(await applyAndCheck(preview), preview);
    }
    s.state = 'ready';
  } catch (e) {
    s.state = 'failed';
    s.error = String(e.message ?? e).slice(0, 4000);
  } finally {
    s.cost = Math.round(s.rounds.reduce((n, r) => n + (r.cost ?? 0), 0) * 100) / 100;
    s.finishedAt = new Date().toISOString();
    save();
    console.log(`${s.state.padEnd(6)} ${id} $${s.cost} ${s.rounds.length} rounds${s.error ? `\n  ${s.error.split('\n').slice(0, 6).join('\n  ')}` : ''}`);
  }
}

const queue = [...ids];
await Promise.all(Array.from({length: Math.min(CONCURRENCY, queue.length)}, async () => { while (queue.length) await build(queue.shift()); }));
const total = ids.reduce((n, id) => n + (status[id]?.cost ?? 0), 0);
console.log(`Done: ${ids.filter((id) => status[id]?.state === 'ready').length}/${ids.length} ready, $${total.toFixed(2)}`);
if (!PUBLISH) {
  try { await node(['scripts/launch/pilot-sheet.mjs', OUT, ...ids]); console.log(`Contact sheet: ${OUT}/compare.png`); }
  catch (e) { console.log(`Contact sheet failed: ${String(e.stderr || e.message).slice(0, 400)}`); }
}
