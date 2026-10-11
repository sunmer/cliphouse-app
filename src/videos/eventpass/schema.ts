import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const eventpassSchema = z.object({texts: textsSchema(['brand', 'headline', 'date', 'point1', 'point2', 'point3', 'cta'] as const), theme: themeSchema});
export type EventpassProps = z.infer<typeof eventpassSchema>;
