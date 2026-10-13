import {beatMeta} from '../beat/schema.ts';
import {waitlistScore} from './score.ts';

export const waitlistMeta = beatMeta({
  id: 'waitlist', name: 'Waitlist', width: 1080, height: 1920, posterFrame: 147,
  motion: ['Progress bar','Mask reveal','Wipes','Stamp'],
}, waitlistScore);
