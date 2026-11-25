import assert from 'node:assert/strict';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateProps} from '../src/agent/handoff.ts';
import {schemas} from '../src/videos/schemas.ts';
import type {VideoProps} from '../src/videos/vocab.ts';
import {applyKit, type BrandKit} from '../src/ui/brandKit.ts';
import {PRESETS, adaptBrandTheme, contrast, generatePalettes} from '../src/ui/palettes.ts';

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

test('applyKit overlays shared kit texts without breaking any visible variant schema', () => {
  const kit: BrandKit = {
    enabled: true,
    colorMode: 'adaptive',
    theme: custom,
    textsEnabled: true,
    texts: {
      brand: 'KitePay',
      headline: 'Instant global payouts',
      subhead: 'Pay contractors in 90+ countries with zero FX markup.',
      point1: 'Zero FX fees',
      point2: 'Same-day wire',
      point3: 'Auto tax forms',
      cta: 'Open free account',
    },
  };
  const lightBrand = {background: '#f4f1ea', surface: '#ffffff', foreground: '#14213d', accent: '#2563eb', accent2: '#0f766e'};
  for (const v of visible) {
    const schema = schemas[v.template as keyof typeof schemas];
    const out = applyKit(v.props as VideoProps, kit);
    const result = validateProps(schema, out);
    assert.ok(result.ok, `${v.id}: ${result.ok ? '' : result.error}`);
    if ('brand' in v.props.texts) assert.equal(out.texts.brand, 'KitePay');
    const lightOut = applyKit(v.props as VideoProps, {...kit, theme: lightBrand});
    const lightRes = validateProps(schema, lightOut);
    assert.ok(lightRes.ok, `${v.id} light adaptive: ${lightRes.ok ? '' : lightRes.error}`);
  }
});

test('adaptBrandTheme matches same-tone templates verbatim and preserves polarity on opposite-tone templates', () => {
  const darkTemplate = {background: '#0b0b1e', surface: '#23234d', foreground: '#ffffff', accent: '#ffd23f', accent2: '#ff4f79'};
  const lightTemplate = {background: '#f6f1e7', surface: '#ffffff', foreground: '#1a1a1a', accent: '#c2410c', accent2: '#0f766e'};
  const lightBrand = {background: '#f4f1ea', surface: '#ffffff', foreground: '#14213d', accent: '#1d4ed8', accent2: '#1e3a8a'};

  assert.deepEqual(adaptBrandTheme(lightTemplate, lightBrand), lightBrand);
  const adaptedDark = adaptBrandTheme(darkTemplate, lightBrand);
  assert.equal(adaptedDark.background, darkTemplate.background);
  assert.equal(adaptedDark.foreground, darkTemplate.foreground);
  assert.ok(contrast(adaptedDark.accent, adaptedDark.background) >= 3.2, `accent contrast ${contrast(adaptedDark.accent, adaptedDark.background)}`);
  assert.ok(contrast(adaptedDark.accent2, adaptedDark.background) >= 3.2, `accent2 contrast ${contrast(adaptedDark.accent2, adaptedDark.background)}`);
});
