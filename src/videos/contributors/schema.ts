import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {contributorsScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const contributorsSchema = librarySchema(contributorsScore, ['brand','headline','date','list','cta'] as const);
export type ContributorsProps = z.infer<typeof contributorsSchema>;
