import {beatMeta} from '../beat/schema.ts';
import {breakingchangeScore} from './score.ts';

export const breakingchangeMeta = beatMeta({
  id: 'breakingchange', name: 'Breaking Change', width: 1080, height: 1350, posterFrame: 236,
  motion: ['Mask reveal','Wipes','Line draw','Stagger list'],
}, breakingchangeScore);
