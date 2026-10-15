import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {opensourceScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const opensourceSchema = librarySchema(opensourceScore, ['brand','headline','subhead','cta'] as const);
export type OpensourceProps = z.infer<typeof opensourceSchema>;
