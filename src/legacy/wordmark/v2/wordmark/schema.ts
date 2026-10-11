import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const wordmarkSchema = z.object({
  texts: textsSchema(['brand', 'headline', 'cta'] as const),
  theme: themeSchema,
});

export type WordmarkProps = z.infer<typeof wordmarkSchema>;
