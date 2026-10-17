import {beatMeta} from '../beat/schema.ts';
import {releasenotesScore} from './score.ts';

export const releasenotesMeta = beatMeta({
  id: 'releasenotes', name: 'Release Notes', width: 1920, height: 1080, posterFrame: 208,
  motion: ['Mask reveal','Line draw','Stagger list','Swiss grid'],
}, releasenotesScore);
