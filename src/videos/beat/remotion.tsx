// Remotion helpers for beat templates. Every visual landing comes from the shared plan.
import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {clamp, easeIn, easeOut} from '../shared/motion';
import type {Role, VideoProps} from '../vocab';
import {beatPlan, type BeatPlan} from './plan';
import {listItems} from './list';
import {beatFrame, sceneStartBeat, type BeatScore} from './score';

export type Beat = BeatPlan & {
  score: BeatScore;
  /** The list items the video shows, in order. */
  list: string[];
  /** Frame of an absolute beat. */
  frame: (beat: number) => number;
  /** Frame of a beat inside a scene. */
  scene: (index: number, beat?: number) => number;
  /** Frame of a named cue. Throws for an unknown id, so a typo cannot silently desync picture and sound. */
  cue: (id: string) => number;
  /** Frames per beat. */
  beat: number;
};

/** The beat plan for these props. It changes only when the list item count changes. */
export function useBeat(score: BeatScore, props: Pick<VideoProps, 'texts'>): Beat {
  const list = score.list ? listItems(props) : [];
  const count = list.length;
  const plan = useMemo(() => beatPlan(score, count), [score, count]);
  return {
    ...plan, score, list,
    frame: (beat) => beatFrame(score, beat),
    scene: (index, beat = 0) => beatFrame(score, sceneStartBeat(score, index) + beat),
    cue: (id) => {
      const f = plan.cues[id];
      if (f === undefined) throw new Error(`Unknown cue "${id}". Cues: ${Object.keys(plan.cues).join(', ')}`);
      return f;
    },
    beat: score.beatFrames,
  };
}

/** 0 to 1 over `dur` frames from `start`. */
export const prog = (frame: number, start: number, dur: number, easing = easeOut) =>
  interpolate(frame, [start, start + Math.max(1, dur)], [0, 1], {...clamp, easing});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wordsOf = (text: string) => text.trim().split(/\s+/).filter(Boolean);

type WordsProps = {
  role: Role;
  text: string;
  /** Frame where the first word starts to rise. */
  at: number;
  /** Frames between words. */
  stagger?: number;
  /** Frame where the words leave. Omit to stay. */
  exit?: number;
  size: number;
  lineHeight?: number;
  style?: React.CSSProperties;
  /** Exit direction: 1 moves down, -1 moves up. */
  exitDir?: 1 | -1;
  /** Index of a list item, written to data-list-item for the editor. */
  item?: number;
};

/** Words rise out of line masks. Lines wrap by the container width. */
export const MaskWords: React.FC<WordsProps> = ({role, text, at, stagger = 2, exit, size, lineHeight = 1.04, style, exitDir = -1, item}) => {
  const frame = useCurrentFrame();
  const words = wordsOf(text);
  const h = size * lineHeight;
  return (
    <div style={{fontSize: size, lineHeight: `${h}px`, ...style}}>
      <span data-text-role={role} data-list-item={item}>
        {words.map((word, i) => {
          const tin = prog(frame, at + i * stagger, 8);
          const tout = exit === undefined ? 0 : prog(frame, exit + Math.min(i, 3), 7, easeIn);
          return (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : ''}
              <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: h}}>
                <span style={{display: 'inline-block', transform: `translateY(${(1 - tin) * 105 - tout * 105 * exitDir}%)`}}>{word}</span>
              </span>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

// Text is measured with the real font on a canvas, so wide glyphs (W, M) never overflow.
// Without a canvas (Node), a conservative width ratio stands in.
let measureCtx: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();
export function textWidth(text: string, size: number, weight: number, family: string) {
  const key = `${weight}|${family}|${text}`;
  let unit = widthCache.get(key);
  if (unit === undefined) {
    if (measureCtx === undefined) measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    if (measureCtx) {
      measureCtx.font = `${weight} 100px ${family}`;
      unit = measureCtx.measureText(text).width / 100;
    } else unit = text.length * 0.92;
    // Fonts load asynchronously; only cache measurements made with the real face.
    if (typeof document === 'undefined' || document.fonts.check(`${weight} 100px ${family}`)) widthCache.set(key, unit);
  }
  return unit * size;
}

/** Largest font size (step 2) where the words wrap into at most `lines` rows of `width`. */
export function fitWords(text: string, max: number, width: number, lines: number, weight: number, family: string, min: number) {
  const words = wordsOf(text);
  for (let size = max; size > min; size -= 2) {
    const space = textWidth(' ', size, weight, family);
    if (words.some((w) => textWidth(w, size, weight, family) > width)) continue;
    let rows = 1;
    let used = 0;
    for (const w of words) {
      const ww = textWidth(w, size, weight, family);
      if (used && used + space + ww > width) { rows++; used = ww; } else used += (used ? space : 0) + ww;
    }
    if (rows <= lines) return size;
  }
  return min;
}
/** Rows the words wrap into at a given size. */
export function rowsAt(text: string, size: number, width: number, weight: number, family: string) {
  let rows = 1;
  let used = 0;
  const space = textWidth(' ', size, weight, family);
  for (const w of wordsOf(text)) {
    const ww = textWidth(w, size, weight, family);
    if (used && used + space + ww > width) { rows++; used = ww; } else used += (used ? space : 0) + ww;
  }
  return rows;
}
