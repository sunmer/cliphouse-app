import {beatMeta} from '../beat/schema.ts';
import {modelreleaseScore} from './score.ts';

export const modelreleaseMeta = beatMeta({
  id: 'modelrelease', name: 'Model Release', width: 1080, height: 1080, posterFrame: 172,
  motion: ['Mask reveal','Progress bar','Stagger list'],
}, modelreleaseScore);
