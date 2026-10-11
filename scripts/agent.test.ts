import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {readHandoff, validateProps} from '../src/agent/handoff.ts';
import {agentSpec} from '../src/agent/spec.ts';
import {MAX_HANDOFF_CHARS, handoffPath, versions} from '../src/agent/versions.ts';
import {generationErrors} from '../src/catalog/generation.ts';
import {schemas} from '../src/videos/schemas.ts';
import {engineOf} from '../src/videos/engine.ts';
import {ROLES} from '../src/videos/vocab.ts';

const root = path.resolve(import.meta.dirname, '..');
const visible = manifest.variants.filter((v) => !v.hidden);
const spec = (v: (typeof visible)[number]) => agentSpec({site: 'https://cliphou.se', kind: 'template', id: v.id, url: `https://cliphou.se/templates/${v.id}/`, title: v.title, variant: v, props: v.props as never});

test('every template spec exports a JSON Schema that matches the zod schema', () => {
  for (const v of visible) {
    const s = spec(v);
    assert.deepEqual(s.generation, manifest.templates.find((t) => t.id === v.template)!.generation, v.id);
    assert.deepEqual(generationErrors(v.template, s.generation), [], v.id);
    assert.equal(s.engine, engineOf(v.template), v.id);
    assert.match(s.source.renderCommand, s.engine === 'hyperframes' ? /hyperframes@0\.8\.146 render/ : /remotion render/);
    const roles = Object.keys(schemas[v.template].shape.texts.shape);
    assert.deepEqual(s.jsonSchema.properties.texts.required, roles, v.id);
    assert.equal(s.jsonSchema.properties.texts.additionalProperties, false);
    for (const role of roles) assert.equal(s.jsonSchema.properties.texts.properties[role].maxLength, ROLES[role as keyof typeof ROLES].max);
    assert.equal(s.templateVersion, versions[v.template].at(-1)!.version);
    assert.ok(validateProps(schemas[v.template], s.props).ok, v.id);
    // The documented example must round-trip through the editor parser.
    const raw = new URLSearchParams(s.handoff.example.split('?')[1]).get('props')!;
    assert.ok(readHandoff(raw, schemas[v.template]).ok, v.id);
  }
});

test('generation metadata names a real model and effort', () => {
  for (const t of manifest.templates) assert.deepEqual(generationErrors(t.id, t.generation), [], t.id);
  const agentName = String.fromCharCode(67, 111, 100, 101, 120);
  assert.match(generationErrors('bad', {model: agentName, modelId: agentName.toLowerCase(), provider: 'OpenAI', effort: 'medium'}).join(), /not an agent/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'), new RegExp(agentName, 'i'));
  assert.match(generationErrors('bad', {model: 'Claude Opus 5.5', modelId: 'claude-opus-5-5', provider: 'Anthropic'}).join(), /effort/);
});

test('valid handoffs open; invalid and oversized handoffs are rejected', () => {
  const v = visible[0];
  const schema = schemas[v.template];
  const edited = structuredClone(v.props);
  edited.texts.headline = 'Agent edit';
  edited.theme.accent = '#123ABC';
  const raw = new URLSearchParams(handoffPath(v.id, edited).split('?')[1]).get('props')!;
  assert.deepEqual(readHandoff(raw, schema), {ok: true, props: edited});
  const bad = [
    '{', 'null', '[]', JSON.stringify({texts: edited.texts}),
    JSON.stringify({...edited, code: 'alert(1)'}),
    JSON.stringify({...edited, texts: {...edited.texts, extra: 'x'}}),
    JSON.stringify({...edited, texts: {...edited.texts, headline: 'x'.repeat(ROLES.headline.max + 1)}}),
    JSON.stringify({...edited, texts: {...edited.texts, headline: '   '}}),
    JSON.stringify({...edited, texts: {...edited.texts, headline: 'a\u0007b'}}),
    JSON.stringify({...edited, theme: {...edited.theme, accent: 'url(https://evil.test)'}}),
    JSON.stringify({...edited, theme: {...edited.theme, accent: undefined}}),
    'x'.repeat(MAX_HANDOFF_CHARS + 1),
  ];
  for (const input of bad) {
    const result = readHandoff(input, schema);
    assert.equal(result.ok, false, input.slice(0, 60));
    if (!result.ok) assert.ok(result.error.length > 10);
  }
});

test('image templates accept only their own image IDs', () => {
  const v = visible.find((x) => 'media' in x.props)!;
  const schema = schemas[v.template];
  const props = structuredClone(v.props) as typeof v.props & {media: Record<string, string>};
  const s = spec(v);
  const slot = Object.keys(props.media)[0];
  assert.ok(s.editableFields.media?.[slot].options.length);
  assert.equal(s.jsonSchema.properties.media.additionalProperties, false);
  assert.ok(validateProps(schema, {...props, media: {[slot]: s.editableFields.media![slot].options.at(-1)!.id}}).ok);
  for (const bad of [
    {texts: props.texts, theme: props.theme},
    {...props, media: {[slot]: 'https://evil.test/a.jpg'}},
    {...props, media: {[slot]: '../../secret'}},
    {...props, media: {[slot]: 'lake'}},
    {...props, media: {...props.media, extra: 'coast'}},
    {...props, media: {}},
  ]) assert.equal(validateProps(schema, bad).ok, false, JSON.stringify(bad.media));
  const plain = visible.find((x) => !('media' in x.props))!;
  assert.equal(validateProps(schemas[plain.template], {...plain.props, media: {background: 'coast'}}).ok, false);
});

test('template image assets match their records and stay readable in every preset', async () => {
  const {overlayFor, zoneTones, mediaSlots, slotOptions} = await import('../src/videos/media/catalog.ts');
  for (const t of manifest.templates) {
    const dir = path.join(root, 'src/videos', t.id, 'assets');
    if (!fs.existsSync(path.join(dir, 'records.json'))) { assert.equal(mediaSlots(schemas[t.id]).length, 0, t.id); continue; }
    const records = JSON.parse(fs.readFileSync(path.join(dir, 'records.json'), 'utf8'));
    const prompts = JSON.parse(fs.readFileSync(path.join(dir, 'prompts.json'), 'utf8'));
    for (const r of records) {
      assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dir, r.file))).digest('hex'), r.sha256, `${t.id}/${r.id}: file hash`);
      assert.equal(prompts.find((p: {id: string}) => p.id === r.id)?.prompt, r.prompt, `${t.id}/${r.id}: prompt matches record`);
      for (const f of ['model', 'prompt', 'size', 'quality', 'createdAt']) assert.ok(r[f], `${t.id}/${r.id}: ${f}`);
      assert.equal(r.tones.length, 16, `${t.id}/${r.id}: tones`);
    }
    for (const slot of mediaSlots(schemas[t.id])) for (const o of slotOptions(schemas[t.id], slot)) assert.ok(records.some((r: {id: string}) => r.id === o.id), `${t.id}: ${o.id} has a record`);
    assert.ok(records.length >= 2, `${t.id}: at least two images`);
  }
  assert.ok(overlayFor(zoneTones(Array(16).fill({lo: 0, hi: 1}), [0, 0, 1, 1]), '#000000', '#ffffff') > 0.5);
});

test('versions are immutable, sequential, and match their committed packages', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/build-sources.mjs'), '--check'], {cwd: root, stdio: 'pipe'});
  for (const [template, list] of Object.entries(versions)) {
    list.forEach((entry, i) => {
      assert.equal(entry.version, i + 1);
      const file = path.join(root, 'public/source', template, `v${entry.version}.tar.gz`);
      assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), entry.sha256, `${template} v${entry.version}`);
    });
  }
});

test('a template change creates a new version and keeps the old one renderable', () => {
  // Work on a copy so the real catalog is untouched.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-version-'));
  for (const p of ['LICENSE', 'scripts/build-sources.mjs', 'scripts/source-template', 'src/catalog/manifest.json', 'src/videos', 'src/hyperframes', 'src/legacy', 'public/source', 'node_modules/gsap/dist/gsap.min.js', 'node_modules/@fontsource-variable']) {
    if (fs.existsSync(path.join(root, p))) fs.cpSync(path.join(root, p), path.join(dir, p), {recursive: true});
  }
  const tmpl = 'stack';
  const before = JSON.parse(fs.readFileSync(path.join(dir, 'src/videos/versions.json'), 'utf8'))[tmpl].at(-1).version;
  fs.appendFileSync(path.join(dir, `src/videos/${tmpl}/meta.ts`), '\n// changed\n');
  execFileSync(process.execPath, ['scripts/build-sources.mjs'], {cwd: dir, stdio: 'pipe'});
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'src/videos/versions.json'), 'utf8'))[tmpl];
  assert.equal(after.at(-1).version, before + 1);
  assert.ok(fs.existsSync(path.join(dir, `public/source/${tmpl}/v${before + 1}.tar.gz`)));
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dir, `public/source/${tmpl}/v${before}.tar.gz`))).digest('hex'), after[before - 1].sha256);
  assert.ok(fs.existsSync(path.join(dir, `src/legacy/${tmpl}/v${before}/${tmpl}/Stack.tsx`)));
  assert.match(fs.readFileSync(path.join(dir, 'src/videos/legacy.ts'), 'utf8'), new RegExp(`${tmpl}: \\{[^\\n]*\\b${before}: `));
  assert.match(fs.readFileSync(path.join(dir, 'src/videos/legacy-schemas.ts'), 'utf8'), new RegExp(`${tmpl}: \\{[^\\n]*\\b${before}: `));
  execFileSync(process.execPath, ['scripts/build-sources.mjs', '--check'], {cwd: dir, stdio: 'pipe'});
  fs.rmSync(dir, {recursive: true, force: true});
});
