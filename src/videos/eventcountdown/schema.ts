import type {z} from 'zod';
import {musicSchema} from '../music/schema';
import {eventcountdownScore} from './score';

export const eventcountdownSchema = musicSchema(eventcountdownScore, ['brand', 'headline', 'date', 'point1', 'point2', 'point3', 'cta'] as const);
export type EventcountdownProps = z.infer<typeof eventcountdownSchema>;
