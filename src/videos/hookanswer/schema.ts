import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {hookanswerScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const hookanswerSchema = librarySchema(hookanswerScore, ['brand','headline','subhead','list','cta'] as const);
export type HookanswerProps = z.infer<typeof hookanswerSchema>;
