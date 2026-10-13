import {beatMeta} from '../beat/schema.ts';
import {nowinbetaScore} from './score.ts';

export const nowinbetaMeta = beatMeta({
  id: 'nowinbeta', name: 'Now in Beta', width: 1080, height: 1080, posterFrame: 218,
  motion: ['Stamp','Mask reveal','Line draw','Cursor'],
}, nowinbetaScore);
