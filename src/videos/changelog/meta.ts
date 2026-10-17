import {beatMeta} from '../beat/schema.ts';
import {changelogScore} from './score.ts';

export const changelogMeta = beatMeta({
  id: 'changelog', name: 'Changelog', width: 1080, height: 1350, posterFrame: 160,
  motion: ['Line draw','Stamp','Mask reveal','Stagger list'],
}, changelogScore);
