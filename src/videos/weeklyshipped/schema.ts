import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {weeklyshippedScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const weeklyshippedSchema = librarySchema(weeklyshippedScore, ['brand','headline','date','list','cta'] as const);
export type WeeklyshippedProps = z.infer<typeof weeklyshippedSchema>;
