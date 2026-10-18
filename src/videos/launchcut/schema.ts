import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const launchcutSchema = z.object({
  texts: textsSchema(['brand', 'headline', 'subhead', 'stat', 'point3', 'attribution', 'chart', 'point1', 'point2', 'date', 'cta'] as const),
  theme: themeSchema,
});

export type LaunchcutProps = z.infer<typeof launchcutSchema>;
