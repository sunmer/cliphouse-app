import {beatMeta} from '../beat/schema.ts';
import {benchmarkScore} from './score.ts';

export const benchmarkMeta = beatMeta({
  id: 'benchmark', name: 'Benchmark', width: 1920, height: 1080, posterFrame: 172,
  motion: ['Bar chart race','Line draw','Mask reveal','Wipes'],
}, benchmarkScore);
