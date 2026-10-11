import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const endscreenSchema = z.object({
  texts: textsSchema(['brand', 'headline', 'subhead', 'point1', 'point2', 'cta'] as const),
  theme: themeSchema,
});

export type EndscreenProps = z.infer<typeof endscreenSchema>;
