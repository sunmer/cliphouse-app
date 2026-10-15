import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {apireleaseScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const apireleaseSchema = librarySchema(apireleaseScore, ['brand','headline','date','list','cta'] as const);
export type ApireleaseProps = z.infer<typeof apireleaseSchema>;
