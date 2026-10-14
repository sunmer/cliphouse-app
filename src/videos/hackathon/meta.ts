import {beatMeta} from '../beat/schema.ts';
import {hackathonScore} from './score.ts';

export const hackathonMeta = beatMeta({
  id: 'hackathon', name: 'Hackathon', width: 1080, height: 1920, posterFrame: 240,
  motion: ['Typewriter','Mask reveal','Circle reveal','Line draw'],
}, hackathonScore);
