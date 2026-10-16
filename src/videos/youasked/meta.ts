import {beatMeta} from '../beat/schema.ts';
import {youaskedScore} from './score.ts';

export const youaskedMeta = beatMeta({
  id: 'youasked', name: 'You Asked', width: 1080, height: 1080, posterFrame: 231,
  motion: ['Mask reveal','Flip cards','Circle reveal','Progress bar'],
}, youaskedScore);
