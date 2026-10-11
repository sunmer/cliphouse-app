import type {TemplateMeta} from '../vocab.ts';

export const eventpassMeta: TemplateMeta = {
  id: 'eventpass', name: 'Event Pass', width: 1080, height: 1920, fps: 30, durationInFrames: 300, posterFrame: 92,
  motion: ['Ticket stub', 'Slide-in', 'Stagger list'],
  scenes: [
    {type: 'date-card', from: 0, duration: 162, focus: 92, roles: ['brand', 'headline', 'date', 'cta']},
    {type: 'list', from: 162, duration: 138, focus: 70, roles: ['point1', 'point2', 'point3']},
  ],
};
