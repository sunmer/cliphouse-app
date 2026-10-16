import {beatMeta} from '../beat/schema.ts';
import {featuredemoScore} from './score.ts';

export const featuredemoMeta = beatMeta({
  id: 'featuredemo', name: 'Feature Demo', width: 1920, height: 1080, posterFrame: 250,
  motion: ['Cursor','Mask reveal','Stagger list','Wipes'],
}, featuredemoScore);
