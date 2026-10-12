// Prop schema and metadata for music templates. Kept out of contract.ts and vocab.ts, so the
// shared files every source package hashes stay unchanged and silent templates keep their versions.
import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract.ts';
import type {Role, TemplateMeta, VideoProps} from '../vocab.ts';
import {REQUIRED_ROLES, scoreRoles, scoreScenes, durationInFrames, type Score} from './score.ts';

export type MusicVideoProps = VideoProps & {hidden: Role[]; audio: {enabled: boolean}};
export type MusicMeta = TemplateMeta & {score: Score};

/** Texts and theme plus hidden optional roles and a sound switch. Silent templates reject both fields. */
export function musicSchema<R extends Role>(score: Score, roles: readonly R[]) {
  const scored = scoreRoles(score);
  if (roles.some((r) => !scored.includes(r)) || scored.some((r) => !roles.includes(r as R))) throw new Error('Music schema roles must match the score.');
  const optional = score.optional as [Role, ...Role[]];
  const item = optional.length ? z.enum(optional) : z.never();
  const hidden = z.array(item as z.ZodType<Role>).max(optional.length)
    .refine((list: Role[]) => new Set(list).size === list.length, 'Each hidden role appears once')
    .meta({kind: 'hidden', options: [...optional], required: [...REQUIRED_ROLES]});
  return z.object({
    texts: textsSchema(roles),
    theme: themeSchema,
    hidden,
    audio: z.object({enabled: z.boolean()}).strict(),
  }).strict();
}

type SchemaWithMusic = {shape: {hidden?: {meta?: () => unknown}; audio?: unknown}};
/** True when a schema declares the music fields. */
export const isMusicSchema = (schema: unknown) => !!(schema as SchemaWithMusic).shape.audio;
/** The roles a music schema lets users hide. */
export const hideableRoles = (schema: unknown): Role[] =>
  ((schema as SchemaWithMusic).shape.hidden?.meta?.() as {options?: Role[]} | undefined)?.options ?? [];
export const scoreOf = (meta: TemplateMeta) => (meta as Partial<MusicMeta>).score;
export const isMusicProps = (props: VideoProps): props is MusicVideoProps => Object.hasOwn(props, 'audio');

/** Template metadata whose timing comes from the score. */
export function musicMeta(meta: Omit<TemplateMeta, 'durationInFrames' | 'scenes' | 'fps'>, score: Score): MusicMeta {
  return {...meta, fps: score.fps, durationInFrames: durationInFrames(score), scenes: scoreScenes(score), score};
}
