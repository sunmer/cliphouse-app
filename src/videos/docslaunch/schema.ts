import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {docslaunchScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const docslaunchSchema = librarySchema(docslaunchScore, ['brand','headline','subhead','list','cta'] as const);
export type DocslaunchProps = z.infer<typeof docslaunchSchema>;
