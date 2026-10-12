// The score contract for music templates: plain data and timing math with no runtime imports,
// so Remotion, HyperFrames, the editor, the export server, and source packages share it.
import type {Role, SceneDef, SceneType} from '../vocab.ts';

export const SAMPLE_RATE = 48000;
export const REQUIRED_ROLES = ['brand', 'headline', 'cta'] as const;
export const LAYERS = ['kick', 'hat', 'bass', 'pad'] as const;
export type Layer = (typeof LAYERS)[number];
export const VOICES = ['pluck', 'bell', 'lead'] as const;
export type Voice = (typeof VOICES)[number];
export const SCALES = {minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10]} as const;
export type ScaleName = keyof typeof SCALES;

export type SceneScore = {
  type: SceneType;
  /** Whole bars. Scene starts and lengths never depend on text. */
  bars: number;
  /** Beat within the scene where its content is fully on screen. */
  focusBeat: number;
  roles: Role[];
  /** Structural layers that play in this scene. */
  layers: Layer[];
};

/** A fixed window where one role's words schedule accent hits. */
export type RoleSlot = {
  role: Role;
  scene: number;
  /** Start beat within the scene, on an eighth-note position. */
  beat: number;
  /** Window length in beats. */
  beats: number;
  /** Most accent hits in the window. */
  maxHits: number;
  voice: Voice;
};

export type Score = {
  bpm: number;
  /** Beats per bar. V1 supports 4/4 only. */
  meter: 4;
  fps: 30;
  /** MIDI note of the key root, for example 57 for A3. */
  root: number;
  scale: ScaleName;
  /** Scale degree (0-6) of the chord in each bar, repeated when shorter than the bar count. */
  progression: number[];
  scenes: SceneScore[];
  slots: RoleSlot[];
  /** Roles the user can hide. brand, headline, and cta are never optional. */
  optional: Role[];
  /** Noise risers in absolute beats. */
  risers: {beat: number; beats: number}[];
  /** Impact hits in absolute beats. At least one sits in the last third. */
  impacts: number[];
};

export const beatSeconds = (s: Score) => 60 / s.bpm;
export const totalBars = (s: Score) => s.scenes.reduce((n, scene) => n + scene.bars, 0);
export const totalBeats = (s: Score) => totalBars(s) * s.meter;
export const durationSeconds = (s: Score) => totalBeats(s) * beatSeconds(s);
export const beatTime = (s: Score, beat: number) => beat * beatSeconds(s);
/** Nearest video frame for a beat. At 128 BPM beats fall between frames, so visuals round. */
export const beatFrame = (s: Score, beat: number) => Math.round(beat * beatSeconds(s) * s.fps);
export const frameBeat = (s: Score, frame: number) => frame / s.fps / beatSeconds(s);
export const durationInFrames = (s: Score) => Math.round(durationSeconds(s) * s.fps);
export const durationInSamples = (s: Score) => Math.round(durationSeconds(s) * SAMPLE_RATE);
export const sceneStartBeat = (s: Score, index: number) => s.scenes.slice(0, index).reduce((n, scene) => n + scene.bars * s.meter, 0);
export const slotStartBeat = (s: Score, slot: RoleSlot) => sceneStartBeat(s, slot.scene) + slot.beat;
/** Each role once, in first-appearance order. A role may return in a later scene, for example the brand in an end lockup. */
export const scoreRoles = (s: Score) => [...new Set(s.scenes.flatMap((scene) => scene.roles))];

/** Scene metadata for TemplateMeta, derived from bars so timing always matches the score. */
export function scoreScenes(s: Score): SceneDef[] {
  return s.scenes.map((scene, i) => {
    const from = beatFrame(s, sceneStartBeat(s, i));
    const end = beatFrame(s, sceneStartBeat(s, i + 1));
    return {type: scene.type, from, duration: end - from, focus: beatFrame(s, sceneStartBeat(s, i) + scene.focusBeat) - from, roles: scene.roles};
  });
}

