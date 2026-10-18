import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const beforeafterfxSchema = z.object({
  texts: textsSchema(['headline', 'point1', 'point2', 'brand', 'cta'] as const),
  theme: themeSchema,
});
export type BeforeafterfxProps = z.infer<typeof beforeafterfxSchema>;
