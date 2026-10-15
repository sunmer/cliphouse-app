import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {breakingchangeScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const breakingchangeSchema = librarySchema(breakingchangeScore, ['brand','headline','date','list','cta'] as const);
export type BreakingchangeProps = z.infer<typeof breakingchangeSchema>;
