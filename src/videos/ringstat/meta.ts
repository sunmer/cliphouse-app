import type {TemplateMeta} from '../vocab.ts';

export const ringstatMeta: TemplateMeta = {
  id: 'ringstat', name: 'Ring Stat', width: 1080, height: 1080, fps: 30, durationInFrames: 240, posterFrame: 92,
  motion: ['Counter', 'Line draw', 'Wipes'],
  scenes: [
    {type: 'counter', from: 0, duration: 156, focus: 92, roles: ['brand', 'stat', 'headline']},
    {type: 'tagline', from: 156, duration: 84, focus: 52, roles: ['subhead', 'cta']},
  ],
};
