import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {benchmarkScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const benchmarkSchema = librarySchema(benchmarkScore, ['brand','headline','subhead','list','cta'] as const);
export type BenchmarkProps = z.infer<typeof benchmarkSchema>;
