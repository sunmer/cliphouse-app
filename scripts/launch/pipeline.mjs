// Unattended generation of the launch set. For each template: plan, apply, checks, up to REPAIRS repair
// rounds, beat sheets, one Opus visual review (always), and the checks again. Opus calls run in parallel;
// applying and checking touch the shared tree, so they run one template at a time under a lock.
// The result is "ready" for the user's review, or "failed" with the last errors.
// Usage: node scripts/launch/pipeline.mjs [id ...]   (CONCURRENCY=4 REPAIRS=3 REVIEW=1 RESUME=0)
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';
import {LAUNCH} from './briefs.mjs';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : LAUNCH.map((b) => b.id);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const REPAIRS = Number(process.env.REPAIRS || 3);
const REVIEW = process.env.REVIEW !== '0';
// RESUME=1 resumes every template from its last candidate; RESUME_IDS=a,b resumes only those.
const resumed = (id) => process.env.RESUME === '1' || (process.env.RESUME_IDS ?? '').split(',').includes(id);
const statusFile = path.join(root, 'output/launch/status.json');
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

const files = (id) => ({score: path.join(root, 'src/videos', id, 'score.json'), html: path.join(root, 'src/hyperframes', id, 'index.html')});
function snapshot(id) { const f = files(id); return {score: fs.readFileSync(f.score), html: fs.readFileSync(f.html)}; }
function restore(id, snap) { const f = files(id); fs.writeFileSync(f.score, snap.score); fs.writeFileSync(f.html, snap.html); }
function apply(id) {
  const cand = path.join(root, 'output/launch', id, 'candidate');
  const f = files(id);
  fs.copyFileSync(path.join(cand, 'score.json'), f.score);
  fs.copyFileSync(path.join(cand, 'index.html'), f.html);
}

// Checks that need no model call. Returns the error text, or '' when everything passes.
async function check(id, sheets) {
  try { await node(['scripts/launch/scaffold.mjs']); } catch (e) { return `Scaffold:\n${String(e.stderr || e.message).slice(0, 2000)}`; }
  try { await run(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit'], {cwd: root, maxBuffer: 16 * 1024 * 1024}); }
  catch (e) { return `TypeScript:\n${String(e.stdout).split('\n').filter((l) => l.includes(`/${id}/`)).slice(0, 40).join('\n') || String(e.stdout).slice(0, 4000)}`; }
  try {
    await node(['--import', 'tsx', 'scripts/launch/contract.mjs', id]);
  } catch (e) { return `Contract:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  try { await node(['--import', 'tsx', 'scripts/beat-direction.mjs', '--sheets', sheets, id], {timeout: 1_200_000}); }
  catch (e) { return `Direction gates:\n${String(e.stdout || e.stderr).slice(0, 8000)}`; }
  return '';
}

async function build(id) {
  const dir = path.join(root, 'output/launch', id);
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
  const applyAndCheck = () => exclusive(async () => {
    apply(id);
    const errors = await check(id, sheets);
    if (errors) restore(id, snap);
    return errors;
  });
  const repairLoop = async (errors) => {
    for (let k = 0; errors && k < REPAIRS; k++) {
      fs.writeFileSync(path.join(dir, 'errors.txt'), errors);
      await opus('repair');
      errors = await applyAndCheck();
    }
    if (errors) throw new Error(errors);
  };
  try {
    if (!resumed(id) && !hasCandidate) await opus('plan');
    await repairLoop(await applyAndCheck());
    if (REVIEW) {
      fs.rmSync(path.join(dir, 'sheets'), {recursive: true, force: true});
      fs.cpSync(path.join(sheets, id), path.join(dir, 'sheets'), {recursive: true});
      // Keep the review payload small: the combined beat sheets only. Single focus frames are dropped.
      for (const f of fs.readdirSync(path.join(dir, 'sheets'))) if (!/^beats-.*\.png$/.test(f)) fs.rmSync(path.join(dir, 'sheets', f));
      await opus('review');
      await repairLoop(await applyAndCheck());
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
