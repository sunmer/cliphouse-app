import {beatMeta} from '../beat/schema.ts';
import {metricbumpScore} from './score.ts';

export const metricbumpMeta = beatMeta({
  id: 'metricbump', name: 'Metric Bump', width: 1080, height: 1350, posterFrame: 112,
  motion: ['Bar chart','Line draw','Mask reveal','Circle reveal'],
}, metricbumpScore);
