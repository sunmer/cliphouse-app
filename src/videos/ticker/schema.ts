import type {z} from 'zod';
import {beatSchema} from '../beat/schema.ts';
import {tickerScore} from './score.ts';

export const tickerSchema = beatSchema(tickerScore, ['brand', 'headline', 'list', 'cta'] as const);
export type TickerProps = z.infer<typeof tickerSchema>;
