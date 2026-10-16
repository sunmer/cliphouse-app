import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {whyswitchScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const whyswitchSchema = librarySchema(whyswitchScore, ['brand','headline','list','cta'] as const);
export type WhyswitchProps = z.infer<typeof whyswitchSchema>;
