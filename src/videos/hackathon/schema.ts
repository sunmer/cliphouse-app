import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {hackathonScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const hackathonSchema = librarySchema(hackathonScore, ['brand','headline','date','stat','subhead','cta'] as const);
export type HackathonProps = z.infer<typeof hackathonSchema>;
