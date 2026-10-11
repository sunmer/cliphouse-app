import type {TemplateMeta} from '../vocab.ts';

export const kineticMeta: TemplateMeta = {
  id: 'kinetic',
  name: 'Kinetic',
  width: 1080,
  height: 1080,
  fps: 30,
  durationInFrames: 270,
  posterFrame: 60,
  motion: ['Kinetic type', 'Mask reveal', 'Wipes'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 90, focus: 60, roles: ['headline']},
    {type: 'list', from: 90, duration: 96, focus: 88, roles: ['point1', 'point2', 'point3']},
    {type: 'tagline', from: 186, duration: 84, focus: 56, roles: ['subhead', 'brand', 'cta']},
  ],
};
