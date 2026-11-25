import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const retroconsoleSchema = z.object({
  texts: textsSchema(["brand","headline","subhead","cta"] as const),
  theme: themeSchema,
});

export type RetroconsoleProps = z.infer<typeof retroconsoleSchema>;
