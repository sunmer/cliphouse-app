import {beatMeta} from '../beat/schema.ts';
import {foundernoteScore} from './score.ts';

export const foundernoteMeta = beatMeta({
  id: 'foundernote', name: 'Founder Note', width: 1080, height: 1350, posterFrame: 160,
  motion: ['Mask reveal','Line draw','Circle reveal','Stamp'],
}, foundernoteScore);
