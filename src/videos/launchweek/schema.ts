import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {launchweekScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const launchweekSchema = librarySchema(launchweekScore, ['brand','date','list','headline','subhead','cta'] as const);
export type LaunchweekProps = z.infer<typeof launchweekSchema>;
