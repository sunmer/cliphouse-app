import {beatMeta} from '../beat/schema.ts';
import {barchartScore} from './score.ts';
import song from './song.ts';

export const barchartMeta = beatMeta({
  id: 'barchart',
  name: 'Bar Chart',
  width: 1080,
  height: 1080,
  posterFrame: 203,
  motion: ['Bar chart', 'Counter', 'Mask reveal'],
}, barchartScore, song);
