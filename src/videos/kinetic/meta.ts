import type {TemplateMeta} from '../vocab.ts';

export const kineticMeta: TemplateMeta = {
  id: 'kinetic',
  name: 'Kinetic',
  width: 1080,
  height: 1080,
  fps: 30,
  durationInFrames: 270,
  posterFrame: 236,
  motion: ['Kinetic type', 'Mask reveal', 'Wipes', 'Stagger list'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 90, focus: 50, roles: ['headline']},
    {type: 'list', from: 90, duration: 90, focus: 50, roles: ['point1', 'point2', 'point3']},
    {type: 'end-screen', from: 180, duration: 90, focus: 50, roles: ['subhead', 'brand', 'cta']},
  ],
};
