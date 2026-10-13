import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {versionrevealScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const versionrevealSchema = librarySchema(versionrevealScore, ['brand','stat','headline','list','cta'] as const);
export type VersionrevealProps = z.infer<typeof versionrevealSchema>;
