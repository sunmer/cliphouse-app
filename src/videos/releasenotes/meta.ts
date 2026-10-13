import {beatMeta} from '../beat/schema.ts';
import {releasenotesScore} from './score.ts';

export const releasenotesMeta = beatMeta({
  id: 'releasenotes', name: 'Release Notes', width: 1920, height: 1080, posterFrame: 195,
  motion: ['Mask reveal','Stagger list','Progress bar','Wipes'],
}, releasenotesScore);
