import {beatMeta} from '../beat/schema.ts';
import {quickstartScore} from './score.ts';

export const quickstartMeta = beatMeta({
  id: 'quickstart', name: 'Quickstart', width: 1920, height: 1080, posterFrame: 260,
  motion: ['Typewriter','Counter','Mask reveal','Circle reveal'],
}, quickstartScore);
