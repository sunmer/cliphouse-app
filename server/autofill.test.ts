import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ROLES, roleError} from '../src/videos/vocab.ts';
import {AUTOFILL_ROLES, autofillBrandKit, extractUrl, normalizeAutofill, summarizeHtml} from './autofill.ts';

test('extractUrl detects bare domains and URLs, ignores sentences', () => {
  assert.equal(extractUrl('cliphou.se'), 'https://cliphou.se/');
  assert.equal(extractUrl('https://linear.app/features'), 'https://linear.app/features');
  assert.equal(extractUrl('An AI receptionist for local clinics'), null);
  assert.equal(extractUrl('javascript:alert(1)'), null);
});

test('summarizeHtml extracts title, meta description, theme color, headings, and hex colors', () => {
  const html = `<html><head><title>Relay &amp; Co</title><meta name="description" content="Focus timer for remote teams"><meta name="theme-color" content="#10b981"></head><body><h1>Work calmer</h1><h2>Block deep work</h2><style>body{background:#0f172a;color:#f8fafc}</style></body></html>`;
  const summary = summarizeHtml(html);
  assert.match(summary, /Title: Relay & Co/);
  assert.match(summary, /Focus timer for remote teams/);
  assert.match(summary, /Theme color: #10b981/);
  assert.match(summary, /Work calmer/);
  assert.match(summary, /#0f172a/);
});

test('normalizeAutofill clamps overlong copy and validates hex colors', () => {
  const out = normalizeAutofill({
    texts: {
      brand: 'A Very Long Brand Name That Exceeds Eighteen Characters',
      headline: 'Short headline',
      subhead: '',
      point1: 'One',
      point2: 'Two',
      point3: 'Three',
      cta: 'Start free trial now today forever',
    },
    theme: {
      background: '#112233',
      surface: 'not-a-color',
      foreground: '#FFFFFF',
      accent: '#22C55E',
      accent2: '#38BDF8',
    },
  });
  for (const role of AUTOFILL_ROLES) {
    assert.equal(roleError(role, out.texts[role]), null, `${role}: ${out.texts[role]}`);
    assert.ok(out.texts[role].length <= ROLES[role].max);
  }
  assert.equal(out.theme.background, '#112233');
  assert.equal(out.theme.surface, '#191c24');
  assert.equal(out.theme.foreground, '#ffffff');
});

test('autofillBrandKit parses Anthropic JSON response cleanly', async () => {
  const mockFetch = (async () => new Response(JSON.stringify({
    content: [{
      type: 'text',
      text: JSON.stringify({
        texts: {
          brand: 'KitePay',
          headline: 'Instant global payouts',
          subhead: 'Pay contractors in 90+ countries with zero FX markup.',
          point1: 'Zero FX fees',
          point2: 'Same-day wire',
          point3: 'Auto tax forms',
          cta: 'Open free account',
        },
        theme: {
          background: '#0b1020',
          surface: '#151d36',
          foreground: '#f8fafc',
          accent: '#38bdf8',
          accent2: '#a78bfa',
        },
      }),
    }],
  }), {status: 200, headers: {'content-type': 'application/json'}})) as unknown as typeof fetch;

  const result = await autofillBrandKit('KitePay: global payouts for remote contractors', {
    apiKey: 'test-key',
    fetchImpl: mockFetch,
  });
  assert.equal(result.texts.brand, 'KitePay');
  assert.equal(result.theme.accent, '#38bdf8');
  for (const role of AUTOFILL_ROLES) {
    assert.equal(roleError(role, result.texts[role]), null);
  }
});
