import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {workswithScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const workswithSchema = librarySchema(workswithScore, ['brand','headline','list','cta'] as const);
export type WorkswithProps = z.infer<typeof workswithSchema>;
