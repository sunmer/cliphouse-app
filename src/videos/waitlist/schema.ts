import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {waitlistScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const waitlistSchema = librarySchema(waitlistScore, ['brand','headline','subhead','date','cta'] as const);
export type WaitlistProps = z.infer<typeof waitlistSchema>;
