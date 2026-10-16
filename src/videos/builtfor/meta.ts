import {beatMeta} from '../beat/schema.ts';
import {builtforScore} from './score.ts';

export const builtforMeta = beatMeta({
  id: 'builtfor', name: 'Built For', width: 1080, height: 1350, posterFrame: 150,
  motion: ['Mask reveal','Slice','Stagger list','Wipes'],
}, builtforScore);
