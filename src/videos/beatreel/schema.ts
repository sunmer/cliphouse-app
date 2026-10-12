import {musicSchema} from '../music/schema';
import {beatreelScore} from './score';
import type {z} from 'zod';

export const beatreelSchema = musicSchema(beatreelScore, ['brand', 'headline', 'point1', 'point2', 'point3', 'stat', 'subhead', 'cta'] as const);
export type BeatreelProps = z.infer<typeof beatreelSchema>;
