import type {TemplateMeta} from '../vocab.ts';

export const wordmarkMeta: TemplateMeta = {
  id: 'wordmark',
  name: 'Wordmark',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 160,
  motion: ['Line draw', 'Mask reveal', 'Variable type', 'Wipes'],
  scenes: [
    {type: 'logo-lockup', from: 0, duration: 60, focus: 44, roles: ['brand']},
    {type: 'tagline', from: 60, duration: 60, focus: 30, roles: ['headline']},
    {type: 'end-screen', from: 120, duration: 60, focus: 30, roles: ['brand', 'cta']},
  ],
};
