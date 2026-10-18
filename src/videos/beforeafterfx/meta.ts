import type {TemplateMeta} from '../contract';

// Concept: the slider handle is the argument. It wipes the headline on, drags the old way off, and becomes the CTA.
// Carrier: divider line + round knob. Line at center -> sweeps the headline on -> parks right and floods the panes ->
// drags left to reveal the new way -> drags off the edge -> the knob stretches into the CTA pill -> shrinks back to the center line.
// Effects: kinetic-type (headline, points and brand rise from line masks so the copy keeps the beat),
// split-screen (old and new panes open from the dividing line, so the comparison is the handle itself),
// crash-zoom (the check stamp hits once, on the new way, so it reads as the verdict).
export const beforeafterfxMeta: TemplateMeta = {
  id: 'beforeafterfx',
  name: 'Before After FX',
  width: 1080,
  height: 1350,
  fps: 30,
  durationInFrames: 300,
  posterFrame: 170,
  motion: ['Split screen', 'Kinetic type', 'Mask reveal', 'Line draw', 'Stamp', 'Zoom'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 90, focus: 45, roles: ['headline']},
    {type: 'comparison', from: 90, duration: 120, focus: 75, roles: ['headline', 'point1', 'point2']},
    {type: 'end-screen', from: 210, duration: 90, focus: 40, roles: ['brand', 'cta']},
  ],
};
