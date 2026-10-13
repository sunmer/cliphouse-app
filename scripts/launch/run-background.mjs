// Run the launch pipeline fully detached: its own session, no terminal, so it survives the shell closing
// and keeps retrying through network drops. Log: output/launch/run.log. Status: output/launch/status.json.
// Usage: node scripts/launch/run-background.mjs [id ...]
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const log = fs.openSync(path.join(root, 'output/launch/run.log'), 'a');
const child = spawn('caffeinate', ['-i', process.execPath, 'scripts/launch/pipeline.mjs', ...process.argv.slice(2)],
  {cwd: root, detached: true, stdio: ['ignore', log, log]});
child.unref();
console.log(`pipeline pid ${child.pid}`);
