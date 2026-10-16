import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {featuredemoScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const featuredemoSchema = librarySchema(featuredemoScore, ['brand','headline','list','cta'] as const);
export type FeaturedemoProps = z.infer<typeof featuredemoSchema>;
