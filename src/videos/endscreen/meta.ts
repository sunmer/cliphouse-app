import type {TemplateMeta} from '../vocab.ts';

export const endscreenMeta: TemplateMeta = {
  id: 'endscreen',
  name: 'End Screen',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 600,
  posterFrame: 480,
  motion: ['Progress bar', 'Line draw', 'Mask reveal', 'Wipes', 'Orbit'],
  scenes: [
    {type: 'tagline', from: 0, duration: 105, focus: 70, roles: ['headline', 'subhead']},
    {type: 'end-screen', from: 105, duration: 495, focus: 135, roles: ['brand', 'point1', 'point2', 'cta']},
  ],
};
