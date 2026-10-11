import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const ringstatSchema = z.object({texts: textsSchema(['brand', 'stat', 'headline', 'subhead', 'cta'] as const), theme: themeSchema});
export type RingstatProps = z.infer<typeof ringstatSchema>;
