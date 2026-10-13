import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {shippedScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const shippedSchema = librarySchema(shippedScore, ['brand','headline','subhead','cta'] as const);
export type ShippedProps = z.infer<typeof shippedSchema>;
