import {beatMeta} from '../beat/schema.ts';
import {docslaunchScore} from './score.ts';

export const docslaunchMeta = beatMeta({
  id: 'docslaunch', name: 'Docs Launch', width: 1920, height: 1080, posterFrame: 282,
  motion: ['Stagger list','Mask reveal','Wipes','Circle reveal'],
}, docslaunchScore);
