import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {builtforScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const builtforSchema = librarySchema(builtforScore, ['brand','headline','list','subhead','cta'] as const);
export type BuiltforProps = z.infer<typeof builtforSchema>;
