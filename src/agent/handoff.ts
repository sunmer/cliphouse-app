import {THEME_ROLES, type VideoProps} from '../videos/vocab.ts';
import type {VideoSchema} from '../videos/contract.ts';
import {hideableRoles, isMusicSchema} from '../videos/music/schema.ts';
import {mediaSlots} from '../videos/media/catalog.ts';
import {audioKeys} from '../music/schema.ts';
import {supportsLogo} from '../videos/logo.ts';
import {MAX_HANDOFF_CHARS} from './versions.ts';

export type HandoffResult = {ok: true; props: VideoProps} | {ok: false; error: string};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

type Shape = {shape: Record<string, unknown>};
/** True for beat templates: a sound switch and no hidden roles. */
export const isBeatSchema = (schema: unknown) => !!(schema as Shape).shape.audio && !(schema as Shape).shape.hidden;
/** The exact top-level prop keys of a schema. Music fields exist only on music and beat templates. */
export function propKeys(schema: VideoSchema) {
  return ['texts', 'theme', ...(mediaSlots(schema).length ? ['media'] : []),
    ...(isBeatSchema(schema) ? ['audio'] : isMusicSchema(schema) ? ['hidden', 'audio'] : [])];
}
/** Top-level prop keys that may be left out. A logo is optional: without one, templates show the brand name. */
export const optionalKeys = (schema: VideoSchema) => (supportsLogo(schema) ? ['logo'] : []);
/** The prop keys of a value: the required ones, plus each optional key it carries. */
export const keysFor = (schema: VideoSchema, value: Record<string, unknown>) =>
  [...propKeys(schema), ...optionalKeys(schema).filter((k) => Object.hasOwn(value, k))];

// Agent output is untrusted. Accept only the exact text and color fields of one template.
export function validateProps(schema: VideoSchema, value: unknown): HandoffResult {
  const roles = Object.keys(schema.shape.texts.shape);
  const slots = mediaSlots(schema);
  const top = propKeys(schema);
  const optional = optionalKeys(schema);
  if (!object(value) || !sameKeys(value, keysFor(schema, value))) {
    return {ok: false, error: `Props must contain only ${top.join(', ')}${optional.length ? `, and optionally ${optional.join(', ')}` : ''}.`};
  }
  if (!object(value.texts) || !sameKeys(value.texts, roles)) return {ok: false, error: `texts must contain exactly: ${roles.join(', ')}.`};
  if (!object(value.theme) || !sameKeys(value.theme, THEME_ROLES)) return {ok: false, error: `theme must contain exactly: ${THEME_ROLES.join(', ')}.`};
  if (slots.length && (!object(value.media) || !sameKeys(value.media, slots))) return {ok: false, error: `media must contain exactly: ${slots.join(', ')}.`};
  if (isBeatSchema(schema)) {
    const keys = audioKeys(schema);
    if (!object(value.audio) || !sameKeys(value.audio, keys) || typeof value.audio.enabled !== 'boolean') {
      return {ok: false, error: keys.includes('track') ? 'audio must be {"enabled": boolean, "track": "<track id>"}.' : 'audio must be {"enabled": true} or {"enabled": false}.'};
    }
  } else if (isMusicSchema(schema)) {
    const optional = hideableRoles(schema);
    if (!Array.isArray(value.hidden)) return {ok: false, error: 'hidden must be a list of optional text roles.'};
    const bad = value.hidden.find((r) => !optional.includes(r));
    if (bad !== undefined) return {ok: false, error: `hidden: ${String(bad)} cannot be hidden. Optional roles: ${optional.join(', ') || 'none'}.`};
    if (!object(value.audio) || !sameKeys(value.audio, ['enabled']) || typeof value.audio.enabled !== 'boolean') return {ok: false, error: 'audio must be {"enabled": true} or {"enabled": false}.'};
  }
  for (const role of roles) {
    const text = value.texts[role];
    if (typeof text === 'string' && (!text.trim() || /[\u0000-\u0009\u000b\u000c\u000e-\u001f]/.test(text))) {
      return {ok: false, error: `texts.${role} must contain visible text without control characters.`};
    }
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {ok: false, error: `${issue.path.join('.')}: ${issue.message}.`};
  }
  return {ok: true, props: result.data as VideoProps};
}

export function readHandoff(raw: string, schema: VideoSchema): HandoffResult {
  if (raw.length > MAX_HANDOFF_CHARS) return {ok: false, error: `The props value is longer than ${MAX_HANDOFF_CHARS} characters.`};
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { return {ok: false, error: 'The props value is not valid JSON.'}; }
  return validateProps(schema, value);
}
