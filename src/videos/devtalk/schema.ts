import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {devtalkScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const devtalkSchema = librarySchema(devtalkScore, ['brand','headline','author','attribution','date','cta'] as const);
export type DevtalkProps = z.infer<typeof devtalkSchema>;
