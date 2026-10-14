import {beatMeta} from '../beat/schema.ts';
import {opensourceScore} from './score.ts';

export const opensourceMeta = beatMeta({
  id: 'opensource', name: 'Open Source', width: 1080, height: 1080, posterFrame: 164,
  motion: ['Mask reveal','Slice','Stamp'],
}, opensourceScore);
