import {musicMeta} from '../music/schema.ts';
import {beatreelScore} from './score.ts';

export const beatreelMeta = musicMeta({
  id: 'beatreel', name: 'Beat Showreel', width: 1920, height: 1080, posterFrame: 444,
  motion: ['Kinetic type', 'Mask reveal', '3D cards', 'Bar chart', 'Wipes'],
}, beatreelScore);
