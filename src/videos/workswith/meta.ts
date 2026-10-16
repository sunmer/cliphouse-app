import {beatMeta} from '../beat/schema.ts';
import {workswithScore} from './score.ts';

export const workswithMeta = beatMeta({
  id: 'workswith', name: 'Works With', width: 1080, height: 1080, posterFrame: 221,
  motion: ['Line draw','Mask reveal','Circle reveal','Stagger list'],
}, workswithScore);
