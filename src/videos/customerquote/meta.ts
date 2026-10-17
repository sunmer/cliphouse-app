import {beatMeta} from '../beat/schema.ts';
import {customerquoteScore} from './score.ts';

export const customerquoteMeta = beatMeta({
  id: 'customerquote', name: 'Customer Quote', width: 1080, height: 1080, posterFrame: 150,
  motion: ['Mask reveal','Kinetic type','Stamp','Draw-on'],
}, customerquoteScore);
