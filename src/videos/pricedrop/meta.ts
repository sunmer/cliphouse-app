import {beatMeta} from '../beat/schema.ts';
import {pricedropScore} from './schema.ts';
import song from './song.ts';

export const pricedropMeta = beatMeta(
  {
    id: 'pricedrop', name: 'Price Drop', width: 1920, height: 1080, posterFrame: 100,
    motion: ['Slide-in', 'Stamp', 'Wipes', 'Mask reveal'],
  },
  pricedropScore, song);
