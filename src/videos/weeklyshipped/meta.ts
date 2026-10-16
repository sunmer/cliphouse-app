import {beatMeta} from '../beat/schema.ts';
import {weeklyshippedScore} from './score.ts';

export const weeklyshippedMeta = beatMeta({
  id: 'weeklyshipped', name: 'Weekly Shipped', width: 1080, height: 1920, posterFrame: 178,
  motion: ['Stamp','Stagger list','Counter','Mask reveal'],
}, weeklyshippedScore);
