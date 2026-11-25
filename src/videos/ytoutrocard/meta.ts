import type {TemplateMeta} from '../vocab.ts';

// Concept: one accent pill measures the end screen. It underlines the title,
// stretches into the rail the video frames hang from, then slips between them
// to become the subscribe button.
// Carrier path: small pill (bottom center) -> headline underline -> full-width rail
// -> narrow sliver that drops through the gap -> subscribe pill (same spot it started).
export const ytoutrocardMeta: TemplateMeta = {
  id: 'ytoutrocard',
  name: 'YT Outro Card',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 360,
  posterFrame: 240,
  motion: ['Mask reveal', 'Kinetic type', 'Line draw', 'Split screen', 'Pulse rings'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 75, focus: 40, roles: ['brand', 'headline']},
    {type: 'end-screen', from: 55, duration: 305, focus: 55, roles: ['point1', 'point2']},
    {type: 'logo-lockup', from: 110, duration: 250, focus: 40, roles: ['brand', 'cta']},
  ],
};
