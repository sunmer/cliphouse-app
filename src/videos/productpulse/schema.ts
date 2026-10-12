import type {z} from 'zod';
import {musicSchema} from '../music/schema';
import {productpulseScore} from './score';

export const productpulseSchema = musicSchema(productpulseScore, ['brand', 'headline', 'point1', 'point2', 'point3', 'cta'] as const);
export type ProductpulseProps = z.infer<typeof productpulseSchema>;
