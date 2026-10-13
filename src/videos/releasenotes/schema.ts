import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {releasenotesScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const releasenotesSchema = librarySchema(releasenotesScore, ['brand','headline','date','list','cta'] as const);
export type ReleasenotesProps = z.infer<typeof releasenotesSchema>;
