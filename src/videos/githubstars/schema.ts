import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {githubstarsScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const githubstarsSchema = librarySchema(githubstarsScore, ['brand','stat','headline','subhead','cta'] as const);
export type GithubstarsProps = z.infer<typeof githubstarsSchema>;
