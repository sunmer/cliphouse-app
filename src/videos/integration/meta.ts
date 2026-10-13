import {beatMeta} from '../beat/schema.ts';
import {integrationScore} from './score.ts';

export const integrationMeta = beatMeta({
  id: 'integration', name: 'Integration', width: 1920, height: 1080, posterFrame: 140,
  motion: ['Mask reveal','Line draw','Wipes','Stamp'],
}, integrationScore);
