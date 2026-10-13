import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {metricbumpScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const metricbumpSchema = librarySchema(metricbumpScore, ['brand','stat','headline','subhead','cta'] as const);
export type MetricbumpProps = z.infer<typeof metricbumpSchema>;
