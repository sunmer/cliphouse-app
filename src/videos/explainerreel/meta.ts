import type {TemplateMeta} from '../vocab.ts';

// Concept: one accent bar measures the journey. It underlines the promise, stands up as the
// timeline spine that fills step by step, then widens into the CTA pill and shrinks back to start.
export const explainerreelMeta: TemplateMeta = {
  id: 'explainerreel',
  name: 'Explainer Reel',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 300,
  posterFrame: 150,
  motion: ['Mask reveal', 'Line draw', 'Stagger list', 'Slide-in', 'Progress bar', 'Pulse rings'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 80, focus: 40, roles: ['brand', 'headline', 'subhead']},
    {type: 'steps', from: 75, duration: 150, focus: 75, roles: ['point1', 'point2', 'point3']},
    {type: 'end-screen', from: 220, duration: 80, focus: 40, roles: ['brand', 'cta']},
  ],
};
