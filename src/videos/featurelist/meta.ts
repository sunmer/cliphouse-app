import {beatMeta} from '../beat/schema.ts';
import {featurelistScore} from './score.ts';

export const featurelistMeta = beatMeta({
  id: 'featurelist', name: 'Feature List', width: 1080, height: 1080, posterFrame: 168,
  motion: ['Stagger list','Stamp','Mask reveal','Draw-on'],
}, featurelistScore);
