// Public entry for beat templates: score and props in, plan and audio out.
import type {VideoProps} from '../vocab.ts';
import {listItems} from './list.ts';
import {beatPlan} from './plan.ts';
import type {BeatScore} from './score.ts';
import {encodeWav, renderBeat} from './synth.ts';

export * from './score.ts';
export * from './plan.ts';
export * from './list.ts';
export * from './synth.ts';

/** The list item count the props show. Wording never changes the audio, only this count. */
export const countOf = (score: BeatScore, props: Pick<VideoProps, 'texts'>) => score.list ? listItems(props).length : 0;
export const beatAudio = (score: BeatScore, count: number) => renderBeat(score, beatPlan(score, count));
export const beatWav = (score: BeatScore, props: Pick<VideoProps, 'texts'>) => encodeWav(beatAudio(score, countOf(score, props)));
