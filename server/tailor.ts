import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {schemas} from '../src/videos/schemas.ts';
import {ROLES, THEME_ROLES, type Role} from '../src/videos/vocab.ts';
import {scoreOf as beatScoreOf} from '../src/videos/beat/schema.ts';
import {scoreOf as musicScoreOf} from '../src/videos/music/schema.ts';
import {validateProps} from '../src/agent/handoff.ts';
import {HttpError} from './model.ts';

// One brand description from the agent, mapped onto any template. Roles the brand does not fill keep
// the template's own text, so every result is a valid edit of that template.
export type Brand = {
  name: string; headline?: string; subhead?: string; points?: string[]; cta?: string; date?: string;
  theme?: Partial<Record<(typeof THEME_ROLES)[number], string>>;
};

const HEX = /^#[a-f0-9]{6}$/i;
const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() : '');
// Shorten at a word boundary when one is close, so a long tagline does not end mid-word.
export function fit(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space >= max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, '');
}

export function checkBrand(value: unknown): Brand {
  const b = (value ?? {}) as Record<string, unknown>;
  const name = clean(b.name);
  if (!name) throw new HttpError(400, 'brand.name is required.');
  const points = Array.isArray(b.points) ? b.points.map(clean).filter(Boolean).slice(0, 6) : [];
  const theme: Brand['theme'] = {};
  if (b.theme && typeof b.theme === 'object') {
    for (const role of THEME_ROLES) {
      const color = (b.theme as Record<string, unknown>)[role];
      if (color === undefined) continue;
      if (typeof color !== 'string' || !HEX.test(color)) throw new HttpError(400, `brand.theme.${role} must be #RRGGBB.`);
      theme[role] = color.toLowerCase();
    }
  }
  return {name, headline: clean(b.headline), subhead: clean(b.subhead), points, cta: clean(b.cta), date: clean(b.date), theme};
}

const listScoreOf = (template: string) => {
  const meta = templateMeta[template];
  return beatScoreOf(meta)?.list ?? (musicScoreOf(meta) as {list?: {min: number; max: number; itemMax: number; format?: string}} | undefined)?.list;
};

// Props for one template with the brand applied. Throws only for an unknown template id.
export function tailorProps(variantId: string, brand: Brand) {
  const variant = manifest.variants.find((v) => v.id === variantId && !('hidden' in v && v.hidden));
  if (!variant) throw new HttpError(400, `Unknown template: ${variantId}.`);
  const props = structuredClone(variant.props) as unknown as Record<string, unknown> & {texts: Record<string, string>; theme: Record<string, string>};
  const roles = Object.keys(props.texts) as Role[];
  const points = brand.points ?? [];
  const set = (role: Role, value: string | undefined) => {
    if (!roles.includes(role) || !value) return;
    const short = fit(value, ROLES[role].max);
    if (short) props.texts[role] = short;
  };
  set('brand', brand.name);
  set('headline', brand.headline);
  set('subhead', brand.subhead);
  set('cta', brand.cta);
  set('date', brand.date);
  ['point1', 'point2', 'point3'].forEach((role, i) => set(role as Role, points[i]));
  // `items` is a comma list; `list` is one item per line with limits from the template's score.
  if (roles.includes('items') && points.length >= 2) {
    const current = props.texts.items.split(',').length;
    const items = points.slice(0, Math.min(6, Math.max(2, current))).map((p) => fit(p.replace(/,/g, ' '), 30));
    let joined = items.join(', ');
    while (joined.length > ROLES.items.max && items.length > 2) { items.pop(); joined = items.join(', '); }
    if (joined.length <= ROLES.items.max) props.texts.items = joined;
  }
  const list = listScoreOf(variant.template);
  if (roles.includes('list') && list && list.format !== 'chart' && points.length >= list.min) {
    props.texts.list = points.slice(0, list.max).map((p) => fit(p, list.itemMax)).join('\n');
  }
  for (const role of THEME_ROLES) if (brand.theme?.[role]) props.theme[role] = brand.theme[role]!;
  const schema = schemas[variant.template];
  const original = variant.props as unknown as {texts: Record<string, string>};
  // Roles that still show the template's sample text, so the agent can fill or flag them after the pick.
  const result = (p: typeof props) => ({props: p, template: variant.template,
    kept: roles.filter((r) => p.texts[r] === original.texts[r])});
  if (validateProps(schema, props).ok) return result(props);
  // Restore the template's own text one role at a time until the edit is valid again.
  const attempt = structuredClone(props);
  for (const role of roles.filter((r) => r !== 'brand')) {
    attempt.texts[role] = original.texts[role];
    if (validateProps(schema, attempt).ok) return result(attempt);
  }
  return result({...structuredClone(props), texts: structuredClone(original.texts)});
}
