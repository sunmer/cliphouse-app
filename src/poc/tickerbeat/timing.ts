// The one timing table for Ticker Beat. The composition and the synthesizer both read it,
// so a visual reveal and its sound always share a beat. Text never changes any time here.
import type {Score} from '../../videos/music/score.ts';

export const BPM = 120;
export const FPS = 30;
/** Frames per beat at 120 BPM and 30 fps. */
export const BEAT = 15;
export const TOTAL_BEATS = 16;
export const DURATION = TOTAL_BEATS * BEAT;

/** Scenes in absolute beats: 2 s intro, 4 s list, 2 s CTA. */
export const SCENES = {
  intro: {from: 0, beats: 4},
  list: {from: 4, beats: 8},
  cta: {from: 12, beats: 4},
} as const;

/** Absolute beat where each list item starts to flap, by item count. Seconds 2/3/4, 2/4, and 2. */
export const ITEM_BEATS: Record<1 | 2 | 3, number[]> = {1: [4], 2: [4, 8], 3: [4, 6, 8]};
/** Frames a split-flap row takes from its first flicker to its last settled cell, for any text. */
export const FLAP_FRAMES = 12;
/** Beat offset from an item's start to the settle clack. 0.75 beat is about 11 frames. */
export const SETTLE = 0.75;

/** Fixed identity events. Each is one visual landing and one sound. */
export const EVENTS = {
  /** Marquee bands slam in. */
  bands: 0,
  /** Brand sticker is stamped onto the bands. */
  sticker: 1,
  /** The board headline types on as the list scene opens. */
  boardHeadline: 4,
  /** Brand rises in the CTA scene. */
  ctaBrand: 12,
  /** CTA pill is stamped. The strongest hit of the piece. */
  ctaStamp: 13,
} as const;

export const itemCount = (n: number): 1 | 2 | 3 => Math.max(1, Math.min(3, n)) as 1 | 2 | 3;
export const itemBeats = (n: number) => ITEM_BEATS[itemCount(n)];
export const frameOf = (beat: number) => Math.round(beat * BEAT);

/** The fixed groove: layers, chords, risers, and scene impacts. Item accents are added per count. */
export const tickerBeatScore: Score = {
  bpm: BPM, meter: 4, fps: FPS, root: 52, scale: 'dorian', progression: [0, 3, 5, 4],
  scenes: [
    {type: 'marquee', bars: 1, focusBeat: 2, roles: ['brand', 'headline'], layers: ['kick', 'hat', 'pad']},
    {type: 'list', bars: 2, focusBeat: 6, roles: ['headline', 'point1', 'point2', 'point3'], layers: ['kick', 'hat', 'bass', 'pad']},
    {type: 'logo-lockup', bars: 1, focusBeat: 2, roles: ['brand', 'cta'], layers: ['kick', 'hat', 'bass', 'pad']},
  ],
  slots: [], optional: [],
  risers: [{beat: 10, beats: 2}],
  impacts: [4, 12],
};
