import {beatMeta} from '../beat/schema.ts';
import {pricingchangeScore} from './score.ts';

export const pricingchangeMeta = beatMeta({
  id: 'pricingchange', name: 'Pricing Update', width: 1080, height: 1080, posterFrame: 170,
  motion: ['Mask reveal','Stagger list','Cursor','Line draw'],
}, pricingchangeScore);
