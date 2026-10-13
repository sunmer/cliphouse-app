import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {pricingchangeScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const pricingchangeSchema = librarySchema(pricingchangeScore, ['brand','headline','price','priceNote','list','cta'] as const);
export type PricingchangeProps = z.infer<typeof pricingchangeSchema>;
