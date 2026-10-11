import type {TemplateMeta} from '../vocab.ts';

export const pullquoteMeta: TemplateMeta = {
  id: 'pullquote', name: 'Pull Quote', width: 1080, height: 1350, fps: 30, durationInFrames: 270, posterFrame: 104,
  motion: ['Mask reveal', 'Slide-in', 'Wipes'],
  scenes: [
    {type: 'quote', from: 0, duration: 186, focus: 104, roles: ['brand', 'quote', 'author']},
    {type: 'end-screen', from: 186, duration: 84, focus: 52, roles: ['headline', 'cta']},
  ],
};
