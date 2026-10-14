import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {migrationScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const migrationSchema = librarySchema(migrationScore, ['brand','headline','list','cta'] as const);
export type MigrationProps = z.infer<typeof migrationSchema>;
