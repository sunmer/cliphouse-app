import type {TemplateMeta} from '../vocab.ts';

// Concept: one accent slash is the sale. It cuts across the headline, slams into the price stamp,
// then becomes the CTA button, and finally stretches back into the opening slash so the film loops.
// Storyboard (30fps, 120bpm = 15f beats):
// 0-15    carrier slash at y 65% (rot -12deg), speed lines streak, brand pill drops (y 29%)
// 10-40   headline words slam in, one per 3f (box 920w x 3 lines, y 36-62%)
// 70-86   slash folds into price stamp (860x340, y 42%), price slams on it
// 94-124  priceNote badge pops (y 54%), point1..3 rows slide in from right (y 61/68/74%)
// 165-182 stamp collapses into CTA button (760x160, y 72%), accent -> accent2, pulse ring at 182
// 171-190 brand (y 27%) + headline echo (y 34-58%) + cta land; buttons pulse on beats
// 222-240 text clears, button stretches back into the opening slash
export const flashdropMeta: TemplateMeta = {
  id: 'flashdrop',
  name: 'Flashdrop',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 240,
  posterFrame: 122,
  motion: ['Kinetic type', 'Stamp', 'Stagger list', 'Slide-in', 'Pulse rings'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 80, focus: 40, roles: ['brand', 'headline']},
    {type: 'price-reveal', from: 70, duration: 105, focus: 52, roles: ['price', 'priceNote', 'point1', 'point2', 'point3']},
    {type: 'end-screen', from: 165, duration: 75, focus: 37, roles: ['brand', 'headline', 'cta']},
  ],
};
