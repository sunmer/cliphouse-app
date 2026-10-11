import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const ytintroSchema = z.object({
  texts: textsSchema(['brand', 'headline', 'cta'] as const),
  theme: themeSchema,
});

export type YtintroProps = z.infer<typeof ytintroSchema>;
