import type {TemplateMeta} from '../vocab.ts';

export const threestepsMeta: TemplateMeta = {
  id: 'threesteps',
  name: 'Three Steps',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
  posterFrame: 190,
  motion: ['Swiss grid', 'Mask reveal', 'Line draw', 'Progress bar', 'Stagger list', 'Pulse rings'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 85, focus: 40, roles: ['brand', 'headline', 'subhead']},
    {type: 'steps', from: 80, duration: 145, focus: 110, roles: ['point1', 'point2', 'point3']},
    {type: 'end-screen', from: 220, duration: 80, focus: 40, roles: ['brand', 'cta']},
  ],
};
