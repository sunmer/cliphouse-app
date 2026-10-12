// Prop schema and metadata for beat templates. Every template in the library is one.
import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract.ts';
import type {Role, TemplateMeta} from '../vocab.ts';
import {durationInFrames, FPS, scoreRoles, scoreScenes, type BeatScore} from './score.ts';
import {storedListErrors} from './list.ts';

export type BeatMeta = TemplateMeta & {score: BeatScore};

/** Texts, theme, and the sound switch, plus any extra fields such as media. List rules come from the score. */
export function beatSchema<R extends Role>(score: BeatScore, roles: readonly R[], extra: z.ZodRawShape = {}) {
  const scored = scoreRoles(score);
  if (roles.some((r) => !scored.includes(r)) || scored.some((r) => !roles.includes(r as R))) {
    throw new Error(`Schema roles (${roles.join(', ')}) must match the score roles (${scored.join(', ')}).`);
  }
  return z.object({
    texts: textsSchema(roles),
    theme: themeSchema,
    audio: z.object({enabled: z.boolean()}).strict(),
    ...extra,
  }).strict().superRefine((props, ctx) => {
    const text = (props.texts as Record<string, string>).list;
    if (score.list) for (const message of storedListErrors(score, text ?? '')) ctx.addIssue({code: 'custom', message, path: ['texts', 'list']});
  });
}

/** Template metadata whose timing comes from the score. */
export function beatMeta(meta: Omit<TemplateMeta, 'durationInFrames' | 'scenes' | 'fps'>, score: BeatScore): BeatMeta {
  return {...meta, fps: FPS, durationInFrames: durationInFrames(score), scenes: scoreScenes(score), score};
}
/** The beat score of a template, or undefined for templates without one (including the older music scores). */
export const scoreOf = (meta: TemplateMeta | undefined): BeatScore | undefined => {
  const score = (meta as Partial<BeatMeta> | undefined)?.score;
  return score && Object.hasOwn(score, 'beatFrames') ? score : undefined;
};
