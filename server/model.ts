import {createHash} from 'node:crypto';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {ROLES, THEME_ROLES} from '../src/videos/vocab.ts';
import {mediaSlots, slotOptions} from '../src/videos/media/catalog.ts';
import type {VideoProps} from '../src/videos/vocab.ts';
import {currentVersion, templateVersion} from '../src/agent/versions.ts';
import {agentSpec} from '../src/agent/spec.ts';
import {validateProps} from '../src/agent/handoff.ts';
import {isBeatSchema, propKeys} from '../src/agent/handoff.ts';
import {schemas} from '../src/videos/schemas.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const validId = (id: string) => /^[A-Za-z0-9_-]{24,64}$/.test(id);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function validateShare(body: unknown) {
  if (!object(body) || !exactKeys(body, Object.hasOwn(body, 'templateVersion') ? ['variantId', 'props', 'templateVersion'] : ['variantId', 'props'])) throw new HttpError(400, 'Invalid video.');
  const variant = manifest.variants.find((v) => v.id === body.variantId);
  if (!variant || !object(body.props)) throw new HttpError(400, 'Invalid video.');
  // Clients send the version they edited. Older clients omit it and get the current version.
  const version = Object.hasOwn(body, 'templateVersion') ? body.templateVersion : currentVersion(variant.template);
  if (typeof version !== 'number' || !Number.isInteger(version)) throw new HttpError(400, 'Invalid template version.');
  try { templateVersion(variant.template, version); } catch { throw new HttpError(400, 'Unknown template version.'); }
  const schema = version === currentVersion(variant.template) ? schemas[variant.template] : undefined;
  if (!schema) throw new HttpError(400, 'Unknown template version.');
  const slots = mediaSlots(schema);
  const keys = propKeys(schema);
  const music = keys.includes('audio');
  if (!exactKeys(body.props, keys)) throw new HttpError(400, 'Invalid video.');
  const {texts, theme, media, hidden, audio} = body.props;
  const roles = Object.keys(schema.shape.texts.shape) as (keyof typeof ROLES)[];
  if (!exactKeys(texts, roles) || !exactKeys(theme, [...THEME_ROLES])) throw new HttpError(400, 'Invalid video fields.');
  if (slots.length && (!exactKeys(media, slots) || slots.some((s) => !slotOptions(schema, s).some((o) => o.id === media[s])))) {
    throw new HttpError(400, 'Invalid video photo.');
  }
  for (const role of roles) {
    const text = texts[role];
    if (typeof text !== 'string' || !text.trim() || text.length > ROLES[role].max || /[\u0000-\u0009\u000b\u000c\u000e-\u001f]/.test(text)) {
      throw new HttpError(400, 'Video text is invalid or too long.');
    }
  }
  for (const role of THEME_ROLES) {
    if (typeof theme[role] !== 'string' || !/^#[a-f0-9]{6}$/i.test(theme[role] as string)) throw new HttpError(400, 'Invalid video color.');
  }
  const checked = validateProps(schema, body.props);
  if (!checked.ok) throw new HttpError(400, music && /hidden|audio/.test(checked.error) ? checked.error : 'Video text is invalid or too long.');
  // Canonical key order makes retries of an identical edit idempotent.
  const props = {
    texts: Object.fromEntries(roles.map((role) => [role, texts[role]])),
    theme: Object.fromEntries(THEME_ROLES.map((role) => [role, theme[role]])),
    ...(slots.length ? {media: Object.fromEntries(slots.map((s) => [s, (media as Record<string, unknown>)[s]]))} : {}),
    // Hidden roles keep the score's role order, so equal sets give the same fingerprint.
    ...(music && !isBeatSchema(schema) ? {hidden: roles.filter((r) => (hidden as string[]).includes(r))} : {}),
    ...(music ? {audio: {enabled: (audio as {enabled: boolean}).enabled,
      ...(Object.hasOwn(audio as object, 'track') ? {track: (audio as {track: string}).track} : {})}} : {}),
  } as VideoProps;
  return {variantId: variant.id, template: variant.template, templateVersion: version, props,
    composition: version === currentVersion(variant.template) ? variant.template : `${variant.template}-v${version}`,
    title: props.texts.headline || props.texts.brand || variant.title, meta: templateMeta[variant.template]};
}
export type Snapshot = ReturnType<typeof validateShare>;
export type Published = Omit<Snapshot, 'meta' | 'composition' | 'templateVersion'> & {templateVersion?: number; id: string; owner: string; status: string; createdAt: number};
export type Exported = {id: string; owner: string; variantId: string; template: string; title: string; status: string; createdAt: number};
export const exportFilename = (video: Pick<Exported, 'variantId' | 'title'>) =>
  `${(video.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || video.variantId)}-made-with-cliphouse.mp4`;
export const publicExport = (video: Exported, url: string) => ({id: video.id, filename: exportFilename(video), url});
export const fingerprint = (uid: string, value: Snapshot, version: string) =>
  createHash('sha256').update(JSON.stringify([uid, version, value.variantId, value.templateVersion, value.props])).digest('hex');

// Shares created before versioning are pinned to v1, the first published source package.
export const shareVersion = (video: Pick<Published, 'templateVersion'>) => video.templateVersion ?? 1;

export function publicVideo(video: Published, origin: string) {
  return {id: video.id, variantId: video.variantId, templateVersion: shareVersion(video), props: video.props, title: video.title,
    url: `${origin}/s/${video.id}`, image: `${origin}/s/${video.id}/preview.jpg`, agent: `${origin}/s/${video.id}/agent.json`};
}
export function shareSpec(video: Published, origin: string) {
  return agentSpec({site: origin, kind: 'share', id: video.id, url: `${origin}/s/${video.id}`, title: video.title,
    variant: {id: video.variantId, template: video.template}, props: video.props, version: shareVersion(video)});
}
const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
export function shareHtml(video: Published, origin: string, assets: {file: string; css?: string[]}) {
  const data = publicVideo(video, origin);
  const meta = templateMeta[video.template];
  const description = video.props.texts.subhead || 'Watch this video or make your own edit.';
  const imageHeight = Math.round(meta.height * 900 / meta.width);
  const tag = (property: string, value: string | number) => `<meta property="${property}" content="${escape(String(value))}">`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0e0f12">
<title>${escape(data.title)} | cliphou.se</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${data.url}">
<link rel="alternate" type="application/json" href="${data.agent}" title="Agent spec">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${tag('og:type', 'website')}${tag('og:site_name', 'cliphou.se')}${tag('og:title', data.title)}
${tag('og:description', description)}${tag('og:url', data.url)}
${tag('og:image', data.image)}${tag('og:image:secure_url', data.image)}${tag('og:image:type', 'image/jpeg')}
${tag('og:image:width', 900)}${tag('og:image:height', imageHeight)}${tag('og:image:alt', data.title)}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(data.title)}">
<meta name="twitter:image" content="${data.image}">
<meta name="twitter:image:alt" content="${escape(data.title)}">
${(assets.css || []).map((file) => `<link rel="stylesheet" href="/${escape(file)}">`).join('')}
<script type="module" crossorigin src="/${escape(assets.file)}"></script>
</head><body><div id="root"></div><noscript>
<h1>${escape(data.title)}</h1><img alt="${escape(data.title)}" src="${data.image}" style="max-width:100%;max-height:80vh">
<p><a href="${data.agent}">Agent spec</a> · <a href="/">Browse cliphou.se</a></p><p>Made with <a href="/agents/">cliphou.se</a></p></noscript></body></html>`;
}

export function byteRange(header: string | undefined, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new HttpError(416, 'Invalid byte range.');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) throw new HttpError(416, 'Invalid byte range.');
  return {start, end};
}
