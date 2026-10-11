import type {TemplateMeta} from '../vocab.ts';

export const wordmarkMeta: TemplateMeta = {
  id: 'wordmark',
  name: 'Wordmark',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 96,
  motion: ['Line draw', 'Mask reveal', 'Circle reveal'],
  scenes: [
    {type: 'logo-lockup', from: 0, duration: 130, focus: 96, roles: ['brand', 'headline']},
    {type: 'tagline', from: 130, duration: 50, focus: 30, roles: ['brand', 'cta']},
  ],
};
