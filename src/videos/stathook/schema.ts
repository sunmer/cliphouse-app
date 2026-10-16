import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {stathookScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const stathookSchema = librarySchema(stathookScore, ['brand','stat','headline','subhead','cta'] as const);
export type StathookProps = z.infer<typeof stathookSchema>;
