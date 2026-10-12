import {z} from 'zod';
import {listSchema} from '../tickerlist/schema.ts';
import {tickerBeatList} from './meta.ts';

export const tickerBeatSchema = listSchema(['brand', 'headline', 'point1', 'point2', 'point3', 'cta'] as const, [tickerBeatList],
  {audio: z.object({enabled: z.boolean()}).strict()});
export type TickerBeatProps = z.infer<typeof tickerBeatSchema>;
