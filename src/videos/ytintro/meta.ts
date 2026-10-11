import type {TemplateMeta} from '../vocab.ts';

export const ytintroMeta: TemplateMeta = {
  id: 'ytintro',
  name: 'Channel Intro',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 155,
  motion: ['Progress bar', 'Mask reveal', 'Kinetic type', 'Wipes'],
  scenes: [
    {type: 'transition', from: 0, duration: 30, focus: 15, roles: []},
    {type: 'title-reveal', from: 30, duration: 90, focus: 60, roles: ['brand', 'headline']},
    {type: 'end-screen', from: 120, duration: 60, focus: 30, roles: ['brand', 'headline', 'cta']},
  ],
};
