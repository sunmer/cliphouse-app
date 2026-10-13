import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {nowinbetaScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const nowinbetaSchema = librarySchema(nowinbetaScore, ['brand','headline','subhead','cta'] as const);
export type NowinbetaProps = z.infer<typeof nowinbetaSchema>;
