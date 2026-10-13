import {beatMeta} from '../beat/schema.ts';
import {shippedScore} from './score.ts';

export const shippedMeta = beatMeta({
  id: 'shipped', name: 'Shipped', width: 1080, height: 1920, posterFrame: 189,
  motion: ['Progress bar','Stamp','Mask reveal','Cursor'],
}, shippedScore);
