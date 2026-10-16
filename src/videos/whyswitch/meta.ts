import {beatMeta} from '../beat/schema.ts';
import {whyswitchScore} from './score.ts';

export const whyswitchMeta = beatMeta({
  id: 'whyswitch', name: 'Why Switch', width: 1080, height: 1080, posterFrame: 165,
  motion: ['Mask reveal','Line draw','Stagger list','Circle reveal'],
}, whyswitchScore);
