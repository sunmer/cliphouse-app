import {beatMeta} from '../beat/schema.ts';
import {devtalkScore} from './score.ts';

export const devtalkMeta = beatMeta({
  id: 'devtalk', name: 'Dev Talk', width: 1920, height: 1080, posterFrame: 250,
  motion: ['Mask reveal','Wipes','Line draw','Kinetic type'],
}, devtalkScore);
