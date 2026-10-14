import {beatMeta} from '../beat/schema.ts';
import {githubstarsScore} from './score.ts';

export const githubstarsMeta = beatMeta({
  id: 'githubstars', name: 'GitHub Stars', width: 1080, height: 1080, posterFrame: 165,
  motion: ['Counter','Mask reveal','Stamp'],
}, githubstarsScore);
