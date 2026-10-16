import {beatMeta} from '../beat/schema.ts';
import {hookanswerScore} from './score.ts';

export const hookanswerMeta = beatMeta({
  id: 'hookanswer', name: 'Hook and Answer', width: 1080, height: 1920, posterFrame: 150,
  motion: ['Mask reveal','Progress bar','Stagger list','Draw-on'],
}, hookanswerScore);
