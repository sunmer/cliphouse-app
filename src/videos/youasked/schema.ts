import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {youaskedScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const youaskedSchema = librarySchema(youaskedScore, ['brand','quote','author','headline','cta'] as const);
export type YouaskedProps = z.infer<typeof youaskedSchema>;
