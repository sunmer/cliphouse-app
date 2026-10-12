import type {z} from 'zod';
import {musicSchema} from '../music/schema';
import {featuredropScore} from './score';

export const featuredropSchema = musicSchema(featuredropScore, ['brand', 'headline', 'subhead', 'point1', 'point2', 'point3', 'cta'] as const);
export type FeaturedropProps = z.infer<typeof featuredropSchema>;
