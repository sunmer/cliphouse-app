import {lookup} from 'node:dns/promises';
import net from 'node:net';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {ROLES, THEME_ROLES, roleError, type Role, type Theme} from '../src/videos/vocab.ts';
import {HttpError} from './model.ts';

export const AUTOFILL_ROLES = ['brand', 'headline', 'subhead', 'point1', 'point2', 'point3', 'cta'] as const;
export type AutofillRole = (typeof AUTOFILL_ROLES)[number];
export type AutofillResult = {
  texts: Record<AutofillRole, string>;
  theme: Theme;
  // Gallery variant ids ranked by fit for this brand, best first. Empty when the model picked none.
  picks: string[];
  sourceUrl?: string;
};

const HEX = /^#[0-9a-f]{6}$/i;
const MODEL = process.env.AUTOFILL_MODEL || 'claude-haiku-5-5';
export const PICK_COUNT = 12;

// One compact line per browsable variant, so the model can rank the catalog in the same call.
const visible = manifest.variants.filter((v) => !('hidden' in v && v.hidden));
const visibleIds = new Set(visible.map((v) => v.id));
const CATALOG = visible
  .map((v) => `${v.id} | ${v.purpose} | ${v.title} | ${v.description.slice(0, 90)}`)
  .join('\n');

export function cleanPicks(raw: unknown, valid: Set<string> = visibleIds): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id === 'string' && valid.has(id) && !out.includes(id)) out.push(id);
    if (out.length === PICK_COUNT) break;
  }
  return out;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] >= 224) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true;
    if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7));
    return false;
  }
  return true;
}

export function extractUrl(input: string): string | null {
  const trimmed = input.trim();
  if (/\s/.test(trimmed)) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/[^\s]*)?$/i.test(trimmed)
      ? `https://${trimmed}`
      : null;
  if (!candidate) return null;
  try {
    const u = new URL(candidate);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!u.hostname || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function assertPublicHost(hostname: string) {
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new HttpError(400, 'Private addresses cannot be fetched.');
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new HttpError(400, 'Private addresses cannot be fetched.');
    return;
  }
  const records = await lookup(hostname, {all: true}).catch(() => []);
  if (!records.length || records.some((r) => isPrivateIp(r.address))) {
    throw new HttpError(400, 'Could not safely resolve that website.');
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function summarizeHtml(html: string): string {
  const clean = html.slice(0, 200_000);
  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i');
    const m = clean.match(re);
    return m ? (m[1] || m[2] || '') : '';
  };
  const stripTags = (s: string) => decodeHtml(s.replace(/<[^>]+>/g, ' '));
  const headings = [...clean.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((s) => s.length >= 2 && s.length <= 120)
    .slice(0, 8);
  const hexes = [...new Set((clean.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toLowerCase()))].slice(0, 12);
  const parts = [
    title && `Title: ${decodeHtml(title)}`,
    meta('og:site_name') && `Site name: ${decodeHtml(meta('og:site_name'))}`,
    meta('og:title') && `OG title: ${decodeHtml(meta('og:title'))}`,
    (meta('description') || meta('og:description')) && `Description: ${decodeHtml(meta('description') || meta('og:description'))}`,
    meta('theme-color') && `Theme color: ${decodeHtml(meta('theme-color'))}`,
    headings.length && `Headings: ${headings.join(' | ')}`,
    hexes.length && `Page hex colors: ${hexes.join(', ')}`,
  ].filter(Boolean);
  return parts.join('\n').slice(0, 2400);
}

async function fetchPageSummary(url: string, fetchImpl: typeof fetch): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const parsed = new URL(current);
    await assertPublicHost(parsed.hostname);
    const res = await fetchImpl(current, {
      redirect: 'manual',
      headers: {'User-Agent': 'cliphou.se-autofill/1.0 (+https://cliphou.se)', Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'},
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, current).toString();
      continue;
    }
    if (!res.ok) return '';
    const reader = res.body?.getReader();
    if (!reader) return summarizeHtml(await res.text());
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 256_000) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks).toString('utf8');
    return summarizeHtml(html);
  }
  return '';
}

function clampText(role: Role, raw: unknown, fallback: string): string {
  const max = ROLES[role].max;
  let value = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) value = fallback;
  if (value.length > max) {
    const cut = value.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    value = lastSpace >= Math.floor(max * 0.55) ? cut.slice(0, lastSpace).trim() : cut.trim();
  }
  if (roleError(role, value)) return fallback.slice(0, max);
  return value;
}

const DEFAULT_THEME: Theme = {
  background: '#0e0f12',
  surface: '#191c24',
  foreground: '#f5f6fa',
  accent: '#4ade80',
  accent2: '#60a5fa',
};

export function normalizeAutofill(raw: unknown): AutofillResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as {texts?: Record<string, unknown>; theme?: Record<string, unknown>; picks?: unknown};
  const fallbacks: Record<AutofillRole, string> = {
    brand: 'Your Brand',
    headline: 'Built to stand out',
    subhead: 'Launch faster with crisp motion graphics.',
    point1: 'Fast setup',
    point2: 'Clear story',
    point3: 'Ready to ship',
    cta: 'Try it today',
  };
  const texts = {} as AutofillResult['texts'];
  for (const role of AUTOFILL_ROLES) {
    texts[role] = clampText(role, obj.texts?.[role], fallbacks[role]);
  }
  const theme = {...DEFAULT_THEME};
  for (const role of THEME_ROLES) {
    const candidate = String(obj.theme?.[role] ?? '').trim();
    if (HEX.test(candidate)) theme[role] = candidate.toLowerCase();
  }
  return {texts, theme, picks: cleanPicks(obj.picks)};
}

const SYSTEM_PROMPT = `You personalize motion graphics video templates for cliphou.se.
Given a website summary or a short product/project brief, return ONLY a valid JSON object (no markdown fences, no commentary) with:
{
  "texts": {
    "brand": string (max 18 chars, product/company/channel name),
    "headline": string (max 24 chars, punchy main promise),
    "subhead": string (max 52 chars, concise supporting value prop),
    "point1": string (max 16 chars, crisp benefit/feature 1),
    "point2": string (max 16 chars, crisp benefit/feature 2),
    "point3": string (max 16 chars, crisp benefit/feature 3),
    "cta": string (max 20 chars, direct call to action)
  },
  "theme": {
    "background": "#rrggbb",
    "surface": "#rrggbb",
    "foreground": "#rrggbb",
    "accent": "#rrggbb",
    "accent2": "#rrggbb"
  },
  "picks": [string] (exactly ${PICK_COUNT} template ids from the catalog below, best fit first)
}
Rules:
- Strictly obey every max character limit (never exceed it).
- Match the language of the input brief or website (if Vietnamese, write Vietnamese; if French, write French; etc.).
- Choose a cohesive, high-contrast 5-color palette inspired by the brand (foreground must be clearly legible on both background and surface; accent must pop cleanly).
- Avoid buzzwords and exclamation spam. Write crisp, concrete marketing copy.
- For "picks", choose the templates this brand would actually post: match its kind of business (software, game, shop, creator, event, agency) and its likely moments (launches, sales, updates, hiring). Skip templates for unrelated industries or occasions. Mix formats (16:9, 9:16, 1:1, 4:5). Copy ids exactly.

Catalog (id | purpose | title | description):
${CATALOG}`;

export async function autofillBrandKit(
  prompt: string,
  deps: {apiKey?: string; fetchImpl?: typeof fetch; model?: string} = {},
): Promise<AutofillResult> {
  const trimmed = String(prompt ?? '').trim();
  if (trimmed.length < 2) throw new HttpError(400, 'Enter a website URL or short description.');
  if (trimmed.length > 500) throw new HttpError(400, 'Keep the description under 500 characters.');
  const apiKey = deps.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new HttpError(503, 'AI auto-fill is not configured.');
  const fetchImpl = deps.fetchImpl ?? fetch;

  const url = extractUrl(trimmed);
  let context = trimmed;
  if (url) {
    const summary = await fetchPageSummary(url, fetchImpl).catch(() => '');
    context = summary ? `Website URL: ${url}\n${summary}` : `Website URL: ${url}`;
  }

  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: deps.model ?? MODEL,
      max_tokens: 2000,
      output_config: {effort: 'low'},
      // The prompt (with the catalog) is identical on every call, so it is cached.
      system: [{type: 'text', text: SYSTEM_PROMPT, cache_control: {type: 'ephemeral'}}],
      messages: [{role: 'user', content: context}],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new HttpError(503, 'Auto-fill is temporarily unavailable. Please try again.');
  }
  const body = await res.json() as {content?: Array<{type?: string; text?: string}>};
  const text = (body.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new HttpError(502, 'Could not parse brand kit suggestions. Please try again.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    throw new HttpError(502, 'Could not parse brand kit suggestions. Please try again.');
  }
  const normalized = normalizeAutofill(parsed);
  return url ? {...normalized, sourceUrl: url} : normalized;
}
