import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {featurelistScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const featurelistSchema = librarySchema(featurelistScore, ['brand','headline','list','cta'] as const);
export type FeaturelistProps = z.infer<typeof featurelistSchema>;
