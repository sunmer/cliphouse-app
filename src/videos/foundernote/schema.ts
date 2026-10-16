import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {foundernoteScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const foundernoteSchema = librarySchema(foundernoteScore, ['brand','headline','quote','author','cta'] as const);
export type FoundernoteProps = z.infer<typeof foundernoteSchema>;
