import type {TemplateMeta} from '../vocab.ts';

export const pricedropMeta: TemplateMeta = {
  id: 'pricedrop', name: 'Price Drop', width: 1920, height: 1080, fps: 30, durationInFrames: 240, posterFrame: 92,
  motion: ['Slide-in', 'Stamp', 'Wipes'],
  scenes: [
    {type: 'price-reveal', from: 0, duration: 168, focus: 92, roles: ['brand', 'headline', 'priceNote', 'price']},
    {type: 'end-screen', from: 168, duration: 72, focus: 42, roles: ['headline', 'cta']},
  ],
};
