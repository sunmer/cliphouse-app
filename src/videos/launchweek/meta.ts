import {beatMeta} from '../beat/schema.ts';
import {launchweekScore} from './score.ts';

export const launchweekMeta = beatMeta({
  id: 'launchweek', name: 'Launch Week', width: 1920, height: 1080, posterFrame: 240,
  motion: ['Route line','Stagger list','Mask reveal','Wipes'],
}, launchweekScore);
