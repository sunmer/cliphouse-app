import {beatMeta} from '../beat/schema.ts';
import {launchdayScore} from './score.ts';

export const launchdayMeta = beatMeta({
  id: 'launchday', name: 'Launch Day', width: 1080, height: 1080, posterFrame: 150,
  motion: ['Countdown timer','Mask reveal','Progress bar','Circle reveal'],
}, launchdayScore);
