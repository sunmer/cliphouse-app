import {musicMeta} from '../music/schema.ts';
import {featuredropScore} from './score.ts';

export const featuredropMeta = musicMeta({
  id: 'featuredrop', name: 'Feature Drop', width: 1080, height: 1080, posterFrame: 128,
  motion: ['Bento grid', 'Flip cards', 'Mask reveal', 'Kinetic type'],
}, featuredropScore);
