import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {modelreleaseScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const modelreleaseSchema = librarySchema(modelreleaseScore, ['brand','headline','stat','subhead','list','cta'] as const);
export type ModelreleaseProps = z.infer<typeof modelreleaseSchema>;
