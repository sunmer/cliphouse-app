import type {TemplateMeta} from '../vocab.ts';

export const signalMeta: TemplateMeta = {
  id: 'signal', name: 'Signal Launch', width: 1920, height: 1080, fps: 30, durationInFrames: 270, posterFrame: 72,
  motion: ['Mask reveal', 'Line draw', '3D cards', 'Circle reveal'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 102, focus: 72, roles: ['brand', 'headline', 'subhead']},
    {type: 'stat-cards', from: 102, duration: 90, focus: 48, roles: ['point1', 'point2', 'point3']},
    {type: 'end-screen', from: 192, duration: 78, focus: 48, roles: ['brand', 'cta']},
  ],
};
