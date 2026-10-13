import assert from 'node:assert/strict';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateProps} from '../src/agent/handoff.ts';
import {schemas} from '../src/videos/schemas.ts';
import type {VideoProps} from '../src/videos/vocab.ts';
import {applyKit, type BrandKit} from '../src/ui/brandKit.ts';
import {PRESETS, generatePalettes} from '../src/ui/palettes.ts';

const visible = manifest.variants.filter((v) => !v.hidden);
const custom = {background: '#101820', surface: '#1b2a36', foreground: '#FEE715', accent: '#ff6f61', accent2: '#00a6a6'};
const kits: BrandKit[] = [
  ...PRESETS.map((p) => ({enabled: true, theme: p.colors})),
  ...generatePalettes(PRESETS[0].colors, 4, () => 0.37).slice(1).map((p) => ({enabled: true, theme: p.colors})),
  {enabled: true, theme: custom},
];

test('applyKit replaces only the theme', () => {
  for (const v of visible) {
    const props = v.props as VideoProps;
    const before = JSON.stringify(props);
    const out = applyKit(props, {enabled: true, theme: custom});
    assert.equal(JSON.stringify(props), before, `${v.id}: input unchanged`);
    assert.deepEqual(out.theme, custom, v.id);
    const {theme: _a, ...rest} = out;
    const {theme: _b, ...original} = props;
    void _a; void _b;
    assert.deepEqual(rest, original, `${v.id}: only the theme differs`);
  }
});

test('an off or empty kit leaves props unchanged', () => {
  const props = visible[0].props as VideoProps;
  assert.equal(applyKit(props, {enabled: false, theme: custom}), props);
  assert.equal(applyKit(props, {enabled: true, theme: null}), props);
});

test('every visible variant accepts every kit theme', () => {
  for (const v of visible) {
    const schema = schemas[v.template as keyof typeof schemas];
    for (const kit of kits) {
      const result = validateProps(schema, applyKit(v.props as VideoProps, kit));
      assert.ok(result.ok, `${v.id}: ${result.ok ? '' : result.error}`);
    }
  }
});
