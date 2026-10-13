import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {customerquoteScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const customerquoteSchema = librarySchema(customerquoteScore, ['brand','quote','author','cta'] as const);
export type CustomerquoteProps = z.infer<typeof customerquoteSchema>;
