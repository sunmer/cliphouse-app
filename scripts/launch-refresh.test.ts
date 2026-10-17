// The developer refresh pilot: brief shape, distinct pilot worlds, candidate-only defaults, and the review rules.
// Usage: node --import tsx --test scripts/launch-refresh.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {REFRESH, approvedRefresh} from './launch/refresh.mjs';
import {LAUNCH} from './launch/briefs.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const PILOT = ['changelog', 'releasenotes', 'apirelease', 'migration'];

test('the pilot briefs separate information from one visual world', () => {
  assert.deepEqual(Object.keys(REFRESH).sort(), [...PILOT].sort());
  for (const [id, r] of Object.entries(REFRESH)) {
    assert.ok(LAUNCH.some((b) => b.id === id), id);
    assert.ok(r.information && r.visual && r.type && r.summary, id);
    assert.equal(r.references.length, 2, id);
    for (const [file] of r.references) assert.ok(fs.existsSync(path.join(root, file)), `${id}: ${file}`);
    assert.ok(Object.values(r.theme).every((c) => /^#[0-9a-f]{6}$/.test(c)), id);
  }
  const worlds = Object.values(REFRESH).map((r) => r.visual.split(':')[0]);
  assert.equal(new Set(worlds).size, worlds.length, 'every pilot has its own visual world');
  assert.equal(new Set(Object.values(REFRESH).map((r) => r.theme.background)).size, PILOT.length, 'every pilot has its own palette');
  assert.ok(Object.values(REFRESH).every((r) => Number.parseInt(r.theme.background.slice(1, 3), 16) > 200), 'no dark default screens');
});

test('the pilot is candidate-only until ids are approved', () => {
  assert.ok(approvedRefresh().every((id: string) => PILOT.includes(id)), 'only refresh briefs can be approved');
  const pilot = read('scripts/launch/pilot.mjs');
  assert.match(pilot, /PUBLISH: '0'/);
  assert.match(pilot, /LAUNCH_OUTPUT: out/);
  assert.match(read('scripts/launch/pipeline.mjs'), /if \(errors \|\| !PUBLISH\) restore\(id, snap\)/);
});

test('refresh prompts ask for at most one interface metaphor and reject boxy reviews', () => {
  const generate = read('scripts/launch/generate.mjs');
  assert.match(generate, /at most one interface metaphor/);
  assert.match(generate, /mostly rectangular panels, cards, or a UI frame/);
  assert.match(generate, /look like another template in the set/);
  assert.match(generate, /more than one interface metaphor/);
  assert.match(generate, /one distinctive main shape/);
});
