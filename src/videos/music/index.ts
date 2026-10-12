// Public entry for music templates: props in, cue plan, frames, and audio out.
import type {Role} from '../vocab.ts';
import {musicPlan, type MusicPlan} from './cues.ts';
import {beatFrame, type Score} from './score.ts';
import {encodeWav, master} from './synth.ts';

export * from './score.ts';
export * from './cues.ts';
export * from './synth.ts';

export type MusicProps = {texts: Partial<Record<Role, string>>; hidden?: Role[]; audio?: {enabled: boolean}};

export const planFor = (score: Score, props: MusicProps): MusicPlan => musicPlan(score, props.texts, props.hidden ?? []);

/** Frame helpers for compositions: word reveal frames come from the same plan the audio plays. */
export function musicTiming(score: Score, props: MusicProps) {
  const plan = planFor(score, props);
  const hidden = new Set(props.hidden ?? []);
  return {
    plan,
    frame: (beat: number) => beatFrame(score, beat),
    isHidden: (role: Role) => hidden.has(role),
    /** Frame where word `i` of `role` lands. Falls back to the slot window start. */
    wordFrame: (role: Role, i: number) => {
      const r = plan.roles[role];
      return beatFrame(score, r ? r.words[Math.min(i, r.words.length - 1)] : 0);
    },
    windowFrames: (role: Role): [number, number] => {
      const r = plan.roles[role];
      return r ? [beatFrame(score, r.window[0]), beatFrame(score, r.window[1])] : [0, 0];
    },
  };
}

export function renderMusic(score: Score, props: MusicProps) {
  return master(score, planFor(score, props).cues);
}
export const musicWav = (score: Score, props: MusicProps) => encodeWav(renderMusic(score, props));
