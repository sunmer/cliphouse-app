import type {TemplateMeta} from '../vocab.ts';

export const lowerthirdMeta: TemplateMeta = {
  id: 'lowerthird',
  name: 'Lower Thirds',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 270,
  posterFrame: 40,
  motion: ['Lower thirds', 'Slide-in', 'Line draw'],
  scenes: [
    {type: 'lower-third', from: 0, duration: 90, focus: 40, roles: ['brand', 'headline']},
    {type: 'lower-third', from: 90, duration: 90, focus: 40, roles: ['point1', 'subhead']},
    {type: 'lower-third', from: 180, duration: 90, focus: 40, roles: ['brand', 'cta']},
  ],
};
