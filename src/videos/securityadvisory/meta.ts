import {beatMeta} from '../beat/schema.ts';
import {securityadvisoryScore} from './score.ts';

export const securityadvisoryMeta = beatMeta({
  id: 'securityadvisory', name: 'Security Advisory', width: 1080, height: 1350, posterFrame: 210,
  motion: ['Mask reveal','Wipes','Stamp','Bar chart'],
}, securityadvisoryScore);
