import type {z} from 'zod';
import {beatSchema} from '../beat/schema.ts';
import type {BeatScore} from '../beat/score.ts';
import scoreJson from './score.json';

export const pricedropScore = scoreJson as unknown as BeatScore;
export const pricedropSchema = beatSchema(pricedropScore, ['brand', 'headline', 'priceNote', 'price', 'cta'] as const);
export type PricedropProps = z.infer<typeof pricedropSchema>;
