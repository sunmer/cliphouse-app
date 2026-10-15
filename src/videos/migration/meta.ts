import {beatMeta} from '../beat/schema.ts';
import {migrationScore} from './score.ts';

export const migrationMeta = beatMeta({
  id: 'migration', name: 'Migration Guide', width: 1920, height: 1080, posterFrame: 168,
  motion: ['Mask reveal','Stagger list','Progress bar','Circle reveal'],
}, migrationScore);
