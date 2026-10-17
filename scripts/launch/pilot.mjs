// Developer refresh pilot: regenerate templates as review candidates only. Nothing in src/, public/, the
// versions, or the manifest changes. Results: output/launch/pilot/<id>/ (candidate/, gates/, sheets/,
// preview.mp4, poster.jpg, meta.json, log.json), status.json with cost, compare.png, and run.log.
// Usage: node scripts/launch/pilot.mjs [id ...]   (defaults to the four pilot ids; runs detached)
// After review: node --import tsx scripts/launch/publish.mjs <id> [...]
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {REFRESH} from './refresh.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['changelog', 'releasenotes', 'apirelease', 'migration'];
const unknown = ids.filter((id) => !REFRESH[id]);
if (unknown.length) throw new Error(`No refresh brief for ${unknown.join(', ')}. Add one to scripts/launch/refresh.mjs.`);
const out = 'output/launch/pilot';
fs.mkdirSync(path.join(root, out), {recursive: true});
const log = fs.openSync(path.join(root, out, 'run.log'), 'a');
const child = spawn('caffeinate', ['-i', process.execPath, 'scripts/launch/pipeline.mjs', ...ids], {
  cwd: root, detached: true, stdio: ['ignore', log, log],
  env: {...process.env, PUBLISH: '0', LAUNCH_REFRESH: '1', LAUNCH_OUTPUT: out, FORCE: '1', CONCURRENCY: process.env.CONCURRENCY || '2'},
});
child.unref();
console.log(`pilot pid ${child.pid}: ${ids.join(', ')}. Log: ${out}/run.log`);
