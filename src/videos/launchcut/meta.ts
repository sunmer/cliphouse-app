import type {TemplateMeta} from '../vocab.ts';

export const launchcutMeta: TemplateMeta = {
  id: 'launchcut',
  name: 'Launch Cut',
  width: 1080,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
  posterFrame: 178,
  motion: ['Kinetic type', 'Zoom', 'Counter', 'Bar chart', 'Glitch', 'Split screen', 'Liquid glass'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 64, focus: 40, roles: ['brand', 'headline', 'subhead']},
    {type: 'counter', from: 64, duration: 66, focus: 34, roles: ['stat', 'point3']},
    {type: 'chart', from: 130, duration: 72, focus: 54, roles: ['attribution', 'chart']},
    {type: 'comparison', from: 202, duration: 50, focus: 40, roles: ['point1', 'point2', 'date']},
    {type: 'end-screen', from: 252, duration: 48, focus: 44, roles: ['brand', 'cta']},
  ],
};
