import {beatMeta} from '../beat/schema.ts';
import {roadmapScore} from './score.ts';

export const roadmapMeta = beatMeta({
  id: 'roadmap', name: 'Roadmap', width: 1920, height: 1080, posterFrame: 184,
  motion: ['Line draw','Mask reveal','Stagger list','Cursor'],
}, roadmapScore);
