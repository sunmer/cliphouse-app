import {beatMeta} from '../beat/schema.ts';
import {contributorsScore} from './score.ts';

export const contributorsMeta = beatMeta({
  id: 'contributors', name: 'Contributors', width: 1080, height: 1350, posterFrame: 250,
  motion: ['Line draw','Stagger list','Mask reveal','Circle reveal'],
}, contributorsScore);
