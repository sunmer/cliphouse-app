import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const lowerthirdSchema = z.object({
  texts: textsSchema(['brand', 'headline', 'subhead', 'point1', 'cta'] as const),
  theme: themeSchema,
});

export type LowerthirdProps = z.infer<typeof lowerthirdSchema>;
