import type {z} from 'zod';
import {beatSchema} from '../beat/schema.ts';
import {stackScore} from './score.ts';

export const stackSchema = beatSchema(stackScore, ['brand', 'headline', 'list', 'cta'] as const);
export type StackProps = z.infer<typeof stackSchema>;
