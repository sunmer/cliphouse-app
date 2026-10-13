import {beatMeta} from '../beat/schema.ts';
import {beforenowScore} from './score.ts';

export const beforenowMeta = beatMeta({
  id: 'beforenow', name: 'Before and Now', width: 1080, height: 1350, posterFrame: 220,
  motion: ['Wipes','Split screen','Progress bar','Mask reveal'],
}, beforenowScore);
