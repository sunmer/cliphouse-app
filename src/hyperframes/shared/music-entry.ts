// Browser runtime for HyperFrames music templates. Bundled into music.js by `npm run music:runtime`.
// It computes the same cue plan as the editor and export server, builds word masks from variables,
// and rebuilds the paused GSAP timeline in place when the editor changes text.
import {musicPlan, wordsOf, type MusicPlan} from '../../videos/music/cues.ts';
import {beatSeconds, durationSeconds, sceneStartBeat, type Score} from '../../videos/music/score.ts';
import type {Role} from '../../videos/vocab.ts';

type Vars = Record<string, string | boolean | number>;
type Timeline = {
  clear(): Timeline; time(t?: number): number; duration(): number;
  getChildren(nested?: boolean, tweens?: boolean, timelines?: boolean): {revert?: () => void; startTime(): number; endTime(): number; targets?: () => unknown[]}[]; set(target: unknown, vars: object, at: number): Timeline;
};
type Win = Window & {
  __timelines?: Record<string, Timeline>;
  __hfVariables?: Vars;
  __hyperframes?: {getVariables?: () => Vars};
  cliphouseFitText?: () => void;
  cliphouseMusicUpdate?: (vars: Vars) => void;
};

export type Music = {
  score: Score;
  vars: Vars;
  plan: MusicPlan;
  /** Seconds at an absolute beat. */
  at: (beat: number) => number;
  /** Seconds at a beat inside a scene. */
  scene: (index: number, beat?: number) => number;
  duration: number;
  text: (role: Role) => string;
  hidden: (role: Role) => boolean;
  /** Seconds where word i of a role lands. */
  word: (role: Role, i: number) => number;
  /** The masked word spans inside an element filled from data-music-text. */
  spans: (el: Element | null) => HTMLElement[];
};

// Same lookup as the HyperFrames runtime: declared defaults on <html>, then render overrides.
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

function create(score: Score, vars: Vars): Music {
  const roles = [...new Set(score.scenes.flatMap((s) => s.roles))];
  const texts = Object.fromEntries(roles.map((r) => [r, String(vars['text_' + r] ?? '')])) as Record<Role, string>;
  const hiddenSet = new Set(score.optional.filter((r) => vars['hide_' + r] === true));
  const plan = musicPlan(score, texts, [...hiddenSet]);
  const at = (beat: number) => beat * beatSeconds(score);
  return {
    score, vars, plan, at,
    scene: (index, beat = 0) => at(sceneStartBeat(score, index) + beat),
    duration: durationSeconds(score),
    text: (role) => texts[role] ?? '',
    hidden: (role) => hiddenSet.has(role),
    word: (role, i) => {
      const r = plan.roles[role];
      return at(r ? r.words[Math.min(i, r.words.length - 1)] : 0);
    },
    spans: (el) => el ? [...el.querySelectorAll<HTMLElement>('.w')] : [],
  };
}

// Each word sits in its own mask, so it can rise out of the line on its beat.
function fill(el: HTMLElement, text: string) {
  el.textContent = '';
  wordsOf(text).forEach((word, i) => {
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

// data-music-align="bottom": after fitting, shift the masks down so the last line sits on the box bottom.
// A CSS custom property moves them, so the fit measurement and the GSAP word transforms stay untouched.
function alignBottom() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-music-align="bottom"]')) {
    el.style.setProperty('--drop', '0px');
    const masks = el.querySelectorAll<HTMLElement>('.wmask');
    if (!masks.length) continue;
    const top = el.getBoundingClientRect().top;
    const used = Math.max(...[...masks].map((m) => m.getBoundingClientRect().bottom)) - top;
    const scale = el.getBoundingClientRect().height / Math.max(1, el.clientHeight);
    el.style.setProperty('--drop', `${Math.max(0, el.clientHeight - used / scale)}px`);
  }
}

/**
 * Build the composition on the template's paused timeline. `build` adds every tween with absolute times.
 * The template creates and registers the timeline itself (window.__timelines.main), so HyperFrames lint sees it.
 * The editor calls `cliphouseMusicUpdate` after text or hidden-role edits. The timeline is reverted,
 * cleared, and rebuilt in place, so the runtime keeps the same timeline object.
 */
export function mount(tl: Timeline, score: Score, build: (tl: Timeline, m: Music) => void) {
  const win = window as Win;
  const run = (vars: Vars) => {
    const m = create(score, vars);
    for (const el of document.querySelectorAll<HTMLElement>('[data-music-text]')) fill(el, m.text(el.dataset.musicText as Role));
    for (const el of document.querySelectorAll<HTMLElement>('[data-role-block]')) el.style.display = m.hidden(el.dataset.roleBlock as Role) ? 'none' : '';
    win.cliphouseFitText?.();
    alignBottom();
    build(tl, m);
    // Pin the length to the score, so text never changes the duration. A tween that runs past the
    // last frame breaks the loop, so it is an error.
    tl.set({}, {}, m.duration);
    if (tl.duration() > m.duration + 1e-6) {
      const late = tl.getChildren(true, true, false).filter((c) => c.endTime() > m.duration + 1e-6)
        .map((c) => c.startTime().toFixed(2) + "-" + c.endTime().toFixed(2) + " " + Object.entries((c as unknown as {vars: Record<string, unknown>}).vars).filter(([k]) => k !== "parent").map(([k, v]) => k + "=" + String(v)).join("/") + " x" + ((c.targets?.() ?? []).length));
      throw new Error("Timeline runs to " + tl.duration().toFixed(3) + " s, past the score length of " + m.duration + " s: " + late.slice(0, 4).join("; "));
    }
  };
  run(readVars(win));
  win.cliphouseMusicUpdate = (vars) => {
    const time = tl.time();
    for (const child of tl.getChildren()) child.revert?.();
    tl.clear();
    run({...readVars(win), ...vars});
    tl.time(time);
  };
}

export {beatSeconds, durationSeconds};
