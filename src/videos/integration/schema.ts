import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {integrationScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const integrationSchema = librarySchema(integrationScore, ['brand','headline','subhead','cta'] as const);
export type IntegrationProps = z.infer<typeof integrationSchema>;
