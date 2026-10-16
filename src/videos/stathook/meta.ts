import {beatMeta} from '../beat/schema.ts';
import {stathookScore} from './score.ts';

export const stathookMeta = beatMeta({
  id: 'stathook', name: 'Stat Hook', width: 1080, height: 1920, posterFrame: 145,
  motion: ['Kinetic type','Mask reveal','Circle reveal','Progress bar'],
}, stathookScore);
