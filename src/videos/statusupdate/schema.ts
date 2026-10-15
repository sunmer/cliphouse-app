import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {statusupdateScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const statusupdateSchema = librarySchema(statusupdateScore, ['brand','headline','date','list','cta'] as const);
export type StatusupdateProps = z.infer<typeof statusupdateSchema>;
