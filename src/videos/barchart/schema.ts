import type {z} from 'zod';
import {beatSchema} from '../beat/schema.ts';
import {barchartScore} from './score.ts';

export const barchartSchema = beatSchema(barchartScore, ['brand', 'headline', 'subhead', 'list', 'attribution'] as const);
export type BarchartProps = z.infer<typeof barchartSchema>;
