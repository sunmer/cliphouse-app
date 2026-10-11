import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const pullquoteSchema = z.object({texts: textsSchema(['brand', 'quote', 'author', 'headline', 'cta'] as const), theme: themeSchema});
export type PullquoteProps = z.infer<typeof pullquoteSchema>;
