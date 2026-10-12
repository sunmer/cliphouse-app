import {beatMeta} from '../beat/schema.ts';
import {stackScore} from './score.ts';

export const stackMeta = beatMeta({
  id: 'stack', name: 'Stack', width: 1080, height: 1920, posterFrame: 170,
  motion: ['Mask reveal', 'Slide-in', 'Stagger list', 'Circle reveal'],
}, stackScore);
