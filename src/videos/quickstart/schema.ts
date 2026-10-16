import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {quickstartScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const quickstartSchema = librarySchema(quickstartScore, ['brand','headline','stat','list','cta'] as const);
export type QuickstartProps = z.infer<typeof quickstartSchema>;
