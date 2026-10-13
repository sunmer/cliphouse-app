import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {launchdayScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const launchdaySchema = librarySchema(launchdayScore, ['brand','date','headline','subhead','cta'] as const);
export type LaunchdayProps = z.infer<typeof launchdaySchema>;
