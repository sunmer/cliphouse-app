import {beatMeta} from '../beat/schema.ts';
import {launchdayScore} from './score.ts';

export const launchdayMeta = beatMeta({
  id: 'launchday', name: 'Launch Day', width: 1080, height: 1080, posterFrame: 156,
  motion: ['Countdown timer','Kinetic type','Zoom','Stamp'],
}, launchdayScore);
