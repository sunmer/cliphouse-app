import type {TemplateMeta} from '../../videos/vocab.ts';
import type {ListGroup} from '../lists.ts';
import {DURATION, FPS, SCENES, frameOf} from './timing.ts';

export const tickerBeatList: ListGroup = {id: 'offers', label: 'Board items', storage: {kind: 'roles', roles: ['point1', 'point2', 'point3']}, min: 1, max: 3, itemMax: 16};

const scene = (s: {from: number; beats: number}) => ({from: frameOf(s.from), duration: frameOf(s.beats)});

// Fixed: 1080x1080, 30 fps, 8 s at 120 BPM. 2 s intro, 4 s list, 2 s CTA.
export const tickerBeatMeta: TemplateMeta = {
  id: 'tickerbeat', name: 'Ticker Beat', width: 1080, height: 1080, fps: FPS, durationInFrames: DURATION, posterFrame: 150,
  motion: ['Marquee', 'Split-flap', 'Stamp', 'Kinetic type'],
  scenes: [
    {type: 'marquee', ...scene(SCENES.intro), focus: 30, roles: ['brand', 'headline']},
    {type: 'list', ...scene(SCENES.list), focus: 90, roles: ['brand', 'headline', 'point1', 'point2', 'point3']},
    {type: 'logo-lockup', ...scene(SCENES.cta), focus: 30, roles: ['brand', 'headline', 'cta']},
  ],
};
