// Props for templates that use the music library: `audio` carries the chosen track.
// Kept apart from src/videos/beat so existing source packages keep their hashes.
import {z} from 'zod';
import {textsSchema, themeSchema} from '../videos/contract.ts';
import type {Role} from '../videos/vocab.ts';
import {scoreRoles, type BeatScore} from '../videos/beat/score.ts';
import {storedListErrors} from '../videos/beat/list.ts';
import {logoSchema} from '../videos/logo.ts';
import {TRACK_IDS} from './library.ts';

export const libraryAudioSchema = z.object({
  enabled: z.boolean(),
  track: z.enum(TRACK_IDS as [string, ...string[]]).meta({kind: 'track', options: TRACK_IDS}),
}).strict();

/** Library track for templates that had generated music before the library existed. Their props stay as
 * they were ({enabled} only), so drafts, shares, and source packages keep working; only the sound changes. */
export const LEGACY_TRACKS: Record<string, string> = {
  beatreel: 'techno-pulse', productpulse: 'house-shipit', featuredrop: 'house-launch', eventcountdown: 'house-rooftop',
};
/** The library track a template plays, or undefined for silent templates and templates without music. */
export function trackFor(template: string, props: unknown): string | undefined {
  const audio = (props as {audio?: {track?: string}}).audio;
  if (!audio) return undefined;
  return audio.track ?? LEGACY_TRACKS[template];
}

/** A beat-timed template whose sound comes from the music library: texts, theme, {enabled, track}, and an optional logo.
 * The logo replaces the brand name wherever the template shows it; without one the name shows as text. */
export function librarySchema<R extends Role>(score: BeatScore, roles: readonly R[]) {
  const scored = scoreRoles(score);
  if (roles.some((r) => !scored.includes(r)) || scored.some((r) => !roles.includes(r as R))) {
    throw new Error(`Schema roles (${roles.join(', ')}) must match the score roles (${scored.join(', ')}).`);
  }
  return z.object({texts: textsSchema(roles), theme: themeSchema, audio: libraryAudioSchema, logo: logoSchema.optional()}).strict().superRefine((props, ctx) => {
    const text = (props.texts as Record<string, string>).list;
    if (score.list) for (const message of storedListErrors(score, text ?? '')) ctx.addIssue({code: 'custom', message, path: ['texts', 'list']});
  });
}

type Shape = {shape?: {audio?: {shape?: Record<string, unknown>}}};
/** True when a schema's audio carries a library track. */
export const usesLibrary = (schema: unknown) => !!(schema as Shape).shape?.audio?.shape?.track;
/** The audio keys a schema accepts, in order. */
export const audioKeys = (schema: unknown) => Object.keys((schema as Shape).shape?.audio?.shape ?? {enabled: true});
export type LibraryAudio = z.infer<typeof libraryAudioSchema>;
export const libraryAudioOf = (props: unknown): LibraryAudio | undefined => {
  const a = (props as {audio?: Partial<LibraryAudio>}).audio;
  return a && typeof a.track === 'string' ? a as LibraryAudio : undefined;
};
