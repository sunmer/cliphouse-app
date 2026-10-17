import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {GOAL_IDS} from '../src/agent/goals.ts';
import {MOMENT_IDS, RELEASE_MOMENTS, inferMoments, momentOf} from '../src/agent/moments.ts';
import {detectedMoments, rankTemplates, templateSpec} from './mcp.ts';

const root = path.resolve(import.meta.dirname, '..');
const visible = manifest.variants.filter((v) => !('hidden' in v && v.hidden));

test('moments are unique, valid, and point at visible templates', () => {
  assert.equal(new Set(MOMENT_IDS).size, MOMENT_IDS.length);
  assert.equal(MOMENT_IDS.length, 12);
  for (const moment of RELEASE_MOMENTS) {
    assert.ok(moment.goals.length && moment.goals.every((goal) => GOAL_IDS.includes(goal)), moment.id);
    assert.ok(moment.requiredFacts.length && moment.angle && moment.terms.length, moment.id);
    assert.equal(new Set(moment.templates).size, moment.templates.length, moment.id);
    for (const template of moment.templates) assert.ok(visible.some((v) => v.template === template), `${moment.id}: ${template}`);
  }
});

test('an explicit moment filters and keeps its template order', () => {
  for (const id of MOMENT_IDS) {
    const order = momentOf(id).templates as readonly string[];
    const ranked = rankTemplates({moment: id, limit: 20}).map((r) => r.v.template);
    assert.ok(ranked.length, id);
    assert.ok(ranked.every((template) => order.includes(template)), id);
    assert.deepEqual(ranked.map((template) => order.indexOf(template)), [...ranked.map((template) => order.indexOf(template))].sort((a, b) => a - b), id);
  }
  assert.equal(rankTemplates({moment: 'limit-raised', limit: 1})[0].v.template, 'beforenow');
});

test('query moments are hints, not filters', () => {
  assert.deepEqual(inferMoments('We raised the rate limit and quota'), ['limit-raised']);
  assert.ok(inferMoments('The app is now localized with a new language for Sweden').includes('new-language-or-region'));
  assert.ok(inferMoments('Teams is now generally available and out of beta').includes('generally-available'));
  assert.ok(inferMoments('Fixed the crash and improved reliability').includes('reliability-fix'));
  assert.ok(inferMoments('faster performance, new integration, new pricing, open source').length <= 3);
  const plain = rankTemplates({query: 'higher limits', limit: 20}).map((r) => r.v.template);
  assert.ok(plain.some((template) => !(momentOf('limit-raised').templates as readonly string[]).includes(template)));
  assert.deepEqual(detectedMoments('higher limits')[0], {id: 'limit-raised', label: 'A limit was raised or removed',
    requiredFacts: ['the old limit or constraint', 'the new limit'], angle: 'Contrast the old ceiling with the new room to work.', goals: ['announce-feature', 'announce-pricing']});
});

test('moments are in agent specs and search, not frontend or SEO data', () => {
  assert.ok(templateSpec('https://cliphou.se', 'youasked-launch')!.moments.includes('most-requested-feature'));
  assert.ok(rankTemplates({moment: 'integration-live', limit: 1}).length);
  assert.ok(visible.every((v) => !('moments' in v)), 'catalog variants stay free of moments');
  for (const file of ['src/catalog/catalog.ts', 'src/ui/Gallery.tsx', 'src/ui/Editor.tsx', 'scripts/build-seo.mjs', 'src/seo/content.mjs'])
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8').includes('moments'), false, file);
});
