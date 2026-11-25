import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const creatorlowerSchema = z.object({
  texts: textsSchema(["brand","headline","subhead","cta"] as const),
  theme: themeSchema,
});

export type CreatorlowerProps = z.infer<typeof creatorlowerSchema>;
