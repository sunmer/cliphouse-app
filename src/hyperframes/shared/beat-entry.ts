// Browser runtime for HyperFrames beat templates. Bundled into beat.js by `npm run beat:runtime`.
// It computes the same plan as the editor and export server, fills list rows and word masks from
// variables, and rebuilds the paused GSAP timeline in place when the editor changes text.
import {beatPlan, type BeatPlan} from '../../videos/beat/plan.ts';
import {parseLines} from '../../videos/beat/list.ts';
import {beatSeconds, durationSeconds, sceneStartBeat, type BeatScore} from '../../videos/beat/score.ts';

type Vars = Record<string, string | boolean | number>;
type Timeline = {
  clear(): Timeline; time(t?: number): number; duration(): number;
  getChildren(nested?: boolean, tweens?: boolean, timelines?: boolean): {revert?: () => void; startTime(): number; endTime(): number}[];
  set(target: unknown, vars: object, at: number): Timeline;
};
type Win = Window & {
  __hfVariables?: Vars;
  __hyperframes?: {getVariables?: () => Vars};
  cliphouseFitText?: () => void;
  cliphouseBeatUpdate?: (vars: Vars) => void;
};

export type Beat = {
  score: BeatScore;
  plan: BeatPlan;
  /** Seconds at an absolute beat. */
  at: (beat: number) => number;
  /** Seconds at a beat inside a scene. */
  scene: (index: number, beat?: number) => number;
  /** Seconds of a named cue. Throws for an unknown id. */
  cue: (id: string) => number;
  /** One entry per shown list item: the item text and its start and accent seconds. */
  items: {text: string; index: number; start: number; accent: number}[];
  duration: number;
  text: (role: string) => string;
  /** The masked word spans inside an element. */
  spans: (el: Element | null) => HTMLElement[];
};

function readVars(win: Win): Vars {
  const runtime = win.__hyperframes?.getVariables?.();
  if (runtime && typeof runtime === 'object' && Object.keys(runtime).length) return {...runtime, ...(win.__hfVariables ?? {})};
  let defaults: Vars = {};
  try {
    const list = JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]') as {id: string; default: string | boolean}[];
    defaults = Object.fromEntries(list.map((d) => [d.id, d.default]));
  } catch { /* Invalid declarations leave the defaults empty. */ }
  return {...defaults, ...(win.__hfVariables ?? {})};
}

function create(score: BeatScore, vars: Vars): Beat {
  const text = (role: string) => String(vars['text_' + role] ?? '');
  const list = score.list ? parseLines(text('list')) : [];
  const plan = beatPlan(score, list.length);
  const at = (beat: number) => beat * beatSeconds(score);
  return {
    score, plan, at, text,
    scene: (index, beat = 0) => at(sceneStartBeat(score, index) + beat),
    cue: (id) => {
      const c = score.cues.find((x) => x.id === id);
      if (!c) throw new Error(`Unknown cue "${id}"`);
      return at(c.beat);
    },
    items: plan.items.map((it) => ({text: list[it.index], index: it.index, start: at(it.start), accent: at(it.accent)})),
    duration: durationSeconds(score),
    spans: (el) => el ? [...el.querySelectorAll<HTMLElement>('.w')] : [],
  };
}

function fill(el: HTMLElement, text: string) {
  el.textContent = '';
  text.trim().split(/\s+/).filter(Boolean).forEach((word, i) => {
    if (i) el.append(' ');
    const mask = document.createElement('span');
    mask.className = 'wmask';
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = word;
    mask.append(span);
    el.append(mask);
  });
}

/**
 * Build the composition on the template's paused timeline. `build` adds every tween at absolute times.
 * List rows: the template puts one `<template data-list-row>` inside a `[data-list]` container. The runtime
 * clones it once per item, sets `data-list-item` and `--i` on each clone, and fills its `[data-list-text]`.
 * Fixed text: elements with `data-beat-text="<role>"` get word masks.
 */
export function mount(tl: Timeline, score: BeatScore, build: (tl: Timeline, m: Beat) => void) {
  const win = window as Win;
  const run = (vars: Vars) => {
    const m = create(score, vars);
    for (const host of document.querySelectorAll<HTMLElement>('[data-list]')) {
      const tpl = host.querySelector<HTMLTemplateElement>('template[data-list-row]');
      if (!tpl) continue;
      for (const old of host.querySelectorAll('[data-list-item]')) old.remove();
      host.style.setProperty('--count', String(m.items.length));
      m.items.forEach((item) => {
        const row = (tpl.content.firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;
        row.dataset.listItem = String(item.index);
        row.style.setProperty('--i', String(item.index));
        for (const t of row.querySelectorAll<HTMLElement>('[data-list-text]')) {
          t.dataset.textRole = 'list';
          if (t.hasAttribute('data-words')) fill(t, item.text); else t.textContent = item.text;
        }
        for (const t of row.querySelectorAll<HTMLElement>('[data-list-number]')) t.textContent = String(item.index + 1).padStart(2, '0');
        host.append(row);
      });
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-beat-text]')) fill(el, m.text(el.dataset.beatText!));
    win.cliphouseFitText?.();
    build(tl, m);
    // Pin the length to the score. A tween past the last frame breaks the loop, so it is an error.
    tl.set({}, {}, m.duration);
    if (tl.duration() > m.duration + 1e-6) throw new Error(`Timeline runs to ${tl.duration().toFixed(3)} s, past the score length of ${m.duration} s`);
  };
  run(readVars(win));
  win.cliphouseBeatUpdate = (vars) => {
    const time = tl.time();
    for (const child of tl.getChildren()) child.revert?.();
    tl.clear();
    run({...readVars(win), ...vars});
    tl.time(time);
  };
}
