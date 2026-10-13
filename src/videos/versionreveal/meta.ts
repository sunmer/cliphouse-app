import {beatMeta} from '../beat/schema.ts';
import {versionrevealScore} from './score.ts';

export const versionrevealMeta = beatMeta({
  id: 'versionreveal', name: 'Version Reveal', width: 1920, height: 1080, posterFrame: 190,
  motion: ['Counter','Mask reveal','Stagger list','Wipes'],
}, versionrevealScore);
