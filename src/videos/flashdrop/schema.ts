import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const flashdropSchema = z.object({
  texts: textsSchema(["brand","headline","price","priceNote","point1","point2","point3","cta"] as const),
  theme: themeSchema,
});

export type FlashdropProps = z.infer<typeof flashdropSchema>;
