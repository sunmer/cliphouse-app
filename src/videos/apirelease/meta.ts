import {beatMeta} from '../beat/schema.ts';
import {apireleaseScore} from './score.ts';

export const apireleaseMeta = beatMeta({
  id: 'apirelease', name: 'API Release', width: 1920, height: 1080, posterFrame: 178,
  motion: ['Typewriter','Mask reveal','Stagger list','Stamp'],
}, apireleaseScore);
