import type {TemplateMeta} from '../vocab.ts';

// Concept: "the console screen bezel boots, frames the title, then becomes the cartridge that says PRESS START."
// Carrier: one pixel-stepped bezel. CRT dot -> scan line -> full grid bezel -> title box -> cartridge -> dot (loop).
export const retroconsoleMeta: TemplateMeta = {
  id: 'retroconsole',
  name: 'Retro Console',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 95,
  motion: ['Line draw', 'Typewriter', 'Stamp', 'Mask reveal', 'Zoom'],
  scenes: [
    {type: 'logo-lockup', from: 0, duration: 65, focus: 30, roles: ['brand']},
    {type: 'title-reveal', from: 55, duration: 80, focus: 40, roles: ['headline', 'subhead']},
    {type: 'end-screen', from: 115, duration: 65, focus: 30, roles: ['brand', 'cta']},
  ],
};
