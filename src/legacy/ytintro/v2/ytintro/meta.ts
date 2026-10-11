import type {TemplateMeta} from '../vocab.ts';

export const ytintroMeta: TemplateMeta = {
  id: 'ytintro',
  name: 'Channel Intro',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 112,
  motion: ['Glitch', 'Kinetic type', 'Wipes'],
  scenes: [
    {type: 'transition', from: 0, duration: 40, focus: 30, roles: []},
    {type: 'title-reveal', from: 40, duration: 140, focus: 72, roles: ['brand', 'headline', 'cta']},
  ],
};
