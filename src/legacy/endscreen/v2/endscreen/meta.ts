import type {TemplateMeta} from '../vocab.ts';

export const endscreenMeta: TemplateMeta = {
  id: 'endscreen',
  name: 'End Screen',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 600,
  posterFrame: 150,
  motion: ['Slide-in', 'Circle reveal', 'Kinetic type'],
  scenes: [
    {type: 'tagline', from: 0, duration: 90, focus: 50, roles: ['headline', 'subhead']},
    {type: 'end-screen', from: 90, duration: 510, focus: 60, roles: ['brand', 'point1', 'point2', 'cta']},
  ],
};
