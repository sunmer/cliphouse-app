import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {beforenowScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const beforenowSchema = librarySchema(beforenowScore, ['brand','subhead','headline','cta'] as const);
export type BeforenowProps = z.infer<typeof beforenowSchema>;
