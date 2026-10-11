import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const pricedropSchema = z.object({texts: textsSchema(['brand', 'headline', 'priceNote', 'price', 'cta'] as const), theme: themeSchema});
export type PricedropProps = z.infer<typeof pricedropSchema>;
