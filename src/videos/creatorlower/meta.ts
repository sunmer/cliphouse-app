import type {TemplateMeta} from '../vocab.ts';

// Concept: "the accent bar is a level meter that measures the speaker".
// Carrier: one vertical accent bar. Dot (f0) -> draws up into the name bar (S1)
// -> stretches down to hold the topic strap (S2) -> kicks a rail sideways that
// locks the handle badge (S3) -> keeps pulsing on the beat through the hold.
export const creatorlowerMeta: TemplateMeta = {
  id: 'creatorlower',
  name: 'Creator Lower Third',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 240,
  posterFrame: 200,
  motion: ['Lower thirds', 'Mask reveal', 'Draw-on', 'Line draw', 'Slide-in', 'Swiss grid'],
  scenes: [
    {type: 'lower-third', from: 0, duration: 110, focus: 40, roles: ['brand', 'headline']},
    {type: 'byline', from: 80, duration: 110, focus: 40, roles: ['brand', 'headline', 'subhead']},
    {type: 'lower-third', from: 150, duration: 90, focus: 30, roles: ['brand', 'headline', 'subhead', 'cta']},
  ],
};
