import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const ytoutrocardSchema = z.object({
  texts: textsSchema(["brand","headline","point1","point2","cta"] as const),
  theme: themeSchema,
});

export type YtoutrocardProps = z.infer<typeof ytoutrocardSchema>;
