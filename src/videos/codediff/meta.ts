import {beatMeta} from '../beat/schema.ts';
import {codediffScore} from './score.ts';

export const codediffMeta = beatMeta({
  id: 'codediff', name: 'Code Diff', width: 1080, height: 1080, posterFrame: 165,
  motion: ['Stagger list','Mask reveal','Line draw','Circle reveal'],
}, codediffScore);
