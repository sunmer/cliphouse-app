import {musicMeta} from '../music/schema.ts';
import {productpulseScore} from './score.ts';

export const productpulseMeta = musicMeta({
  id: 'productpulse', name: 'Product Pulse', width: 1080, height: 1920, posterFrame: 96,
  motion: ['Pulse rings', 'Kinetic type', 'Mask reveal', 'Stagger list'],
}, productpulseScore);
