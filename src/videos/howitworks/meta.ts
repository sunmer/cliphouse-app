import {beatMeta} from '../beat/schema.ts';
import {howitworksScore} from './score.ts';

export const howitworksMeta = beatMeta({
  id: 'howitworks', name: 'How It Works', width: 1080, height: 1080, posterFrame: 160,
  motion: ['Route line','Mask reveal','Stagger list','Circle reveal'],
}, howitworksScore);
