import assert from 'node:assert/strict';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateShare} from './model.ts';
import {checkBrand, fit, tailorProps} from './tailor.ts';
import {rankTemplates, templateSpec} from './mcp.ts';
import {FIXED_SAMPLE_DATA} from '../src/agent/sample-data.ts';

const visible = manifest.variants.filter((v) => !('hidden' in v && v.hidden));
const brand = checkBrand({
  name: 'HejVinter', headline: 'AI-receptionist för serviceföretag som svarar dygnet runt',
  subhead: 'Svarar kunder på svenska, ställer följdfrågor och skapar tydliga serviceärenden.',
  points: ['Svarar 24/7 på svenska', 'Tydliga serviceärenden', 'Första månaden gratis'], cta: 'Testa demon',
  theme: {background: '#0E4549', surface: '#14555a', foreground: '#ffffff', accent: '#c24e1f', accent2: '#eef2f3'},
});

test('every visible template accepts the tailored props', () => {
  for (const v of visible) {
    const {props} = tailorProps(v.id, brand);
    assert.doesNotThrow(() => validateShare({variantId: v.id, props}), v.id);
  }
});

test('the brand fills the shared roles and colors', () => {
  const {props} = tailorProps('bento-launch', brand);
  const texts = props.texts as Record<string, string>;
  assert.equal(texts.brand, 'HejVinter');
  assert.ok(texts.headline.length <= 24 && 'AI-receptionist för serviceföretag'.startsWith(texts.headline), texts.headline);
  assert.equal(texts.point1, 'Svarar 24/7 på', 'points shorten to the 16-character role');
  assert.equal(texts.cta, 'Testa demon');
  assert.equal(props.theme.background, '#0e4549');
  const lists = visible.filter((v) => 'list' in v.props.texts).map((v) => tailorProps(v.id, brand).props.texts as Record<string, string>);
  assert.ok(lists.some((t) => t.list.split('\n')[0].startsWith('Svarar 24/7')), 'line lists take the points');
});

test('fit shortens at a word boundary', () => {
  assert.equal(fit('Svarar när ni inte kan svara', 16), 'Svarar när ni');
  assert.equal(fit('Kort', 16), 'Kort');
  assert.equal(fit('Supercalifragilistic', 8), 'Supercal');
});

test('shortened lists the brand texts that were cut, and only those', () => {
  const {props, shortened} = tailorProps('bento-launch', brand);
  const texts = props.texts as Record<string, string>;
  const headline = shortened.find((s) => s.role === 'headline');
  assert.deepEqual(headline, {role: 'headline', from: brand.headline, to: texts.headline, max: 24});
  assert.ok(!shortened.some((s) => s.role === 'cta'), 'a CTA that fits is not listed');
  assert.ok(shortened.every((s) => s.to.length <= s.max && s.from.length > s.max));
});

test('templates with fixed sample numbers are flagged in the spec and search, and rank lower', () => {
  for (const template of Object.keys(FIXED_SAMPLE_DATA)) assert.ok(visible.some((v) => v.template === template), `${template} is not in the catalog`);
  assert.ok(templateSpec('https://cliphou.se', 'bento-launch')!.fixedSampleContent!.items.length);
  assert.equal('fixedSampleContent' in templateSpec('https://cliphou.se', 'prism-launch')!, false);
  assert.ok(rankTemplates({query: 'bento', limit: 20}).some((r) => r.v.id === 'bento-launch'), 'still findable by name');
  // With no query every launch template starts equal, so a flagged one sits below the unflagged ones.
  // Search returns at most 20, so narrow by aspect to keep the flagged template in the list as the catalog grows.
  const launch = rankTemplates({goal: 'launch-product', aspect: '16:9', limit: 20});
  const flagged = launch.filter((r) => FIXED_SAMPLE_DATA[r.v.template]);
  assert.ok(flagged.length && flagged.every((r) => r.score < launch[0].score));
});

test('checkBrand rejects a missing name and bad colors, and strips control characters', () => {
  assert.throws(() => checkBrand({name: '  '}), /name/);
  assert.throws(() => checkBrand({name: 'X', theme: {accent: 'red'}}), /accent/);
  assert.equal(checkBrand({name: 'A\u0007B'}).name, 'A B');
  assert.throws(() => tailorProps('no-such-template', brand), /Unknown template/);
});

test('keptSample lists roles that still hold sample text, and date fills when given', () => {
  const plain = tailorProps('feature-announcement', brand);
  assert.ok(plain.kept.includes('date'), JSON.stringify(plain.kept));
  assert.ok(!plain.kept.includes('brand'));
  const dated = tailorProps('feature-announcement', checkBrand({name: 'HejVinter', date: 'Live nu'}));
  assert.equal((dated.props.texts as Record<string, string>).date, 'Live nu');
  assert.ok(!dated.kept.includes('date'));
});
