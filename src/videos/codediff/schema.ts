import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {codediffScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const codediffSchema = librarySchema(codediffScore, ['brand','headline','list','cta'] as const);
export type CodediffProps = z.infer<typeof codediffSchema>;
