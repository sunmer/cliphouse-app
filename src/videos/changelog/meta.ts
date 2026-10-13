import {beatMeta} from '../beat/schema.ts';
import {changelogScore} from './score.ts';

export const changelogMeta = beatMeta({
  id: 'changelog', name: 'Changelog', width: 1080, height: 1350, posterFrame: 170,
  motion: ['Line draw','Mask reveal','Stagger list','Circle reveal'],
}, changelogScore);
