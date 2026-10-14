import {beatMeta} from '../beat/schema.ts';
import {statusupdateScore} from './score.ts';

export const statusupdateMeta = beatMeta({
  id: 'statusupdate', name: 'Status Update', width: 1920, height: 1080, posterFrame: 92,
  motion: ['Mask reveal','Line draw','Circle reveal','Stagger list'],
}, statusupdateScore);
