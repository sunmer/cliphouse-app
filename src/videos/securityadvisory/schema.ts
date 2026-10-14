import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {securityadvisoryScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const securityadvisorySchema = librarySchema(securityadvisoryScore, ['brand','stat','headline','subhead','cta'] as const);
export type SecurityadvisoryProps = z.infer<typeof securityadvisorySchema>;
