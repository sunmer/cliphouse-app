import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {changelogScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const changelogSchema = librarySchema(changelogScore, ['brand','headline','date','list','cta'] as const);
export type ChangelogProps = z.infer<typeof changelogSchema>;
