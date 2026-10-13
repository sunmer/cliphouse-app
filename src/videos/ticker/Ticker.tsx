import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {ArrowIcon, Grain, clamp, easeIn, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {listItems} from '../beat/list';
import {beatPlan} from '../beat/plan';
import {beatFrame, durationInFrames, sceneStartBeat} from '../beat/score';
import {tickerScore as score} from './score';
import type {TickerProps as TickerBeatProps} from './schema';

// Every time comes from the score, the same plan the synthesizer plays.
const BEAT = score.beatFrames;
const DURATION = durationInFrames(score);
const frameOf = (beat: number) => beatFrame(score, beat);
const cueBeat = (id: string) => { const c = score.cues.find((x) => x.id === id); if (!c) throw new Error(`Unknown cue ${id}`); return c.beat; };
const EVENTS = {bands: cueBeat('bands'), sticker: cueBeat('sticker'), boardHeadline: cueBeat('boardHeadline'), ctaBrand: cueBeat('ctaBrand'), ctaStamp: cueBeat('ctaStamp')};
const SCENES = {intro: {from: 0, beats: score.scenes[0].bars * 4}, list: {from: sceneStartBeat(score, 1), beats: score.scenes[1].bars * 4}, cta: {from: sceneStartBeat(score, 2), beats: score.scenes[2].bars * 4}};
const SETTLE = score.list!.accentOffset;
/** Frames a split-flap row takes from its first flicker to its last settled cell, for any text. */
const FLAP_FRAMES = 12;
const itemBeats = (n: number) => beatPlan(score, n).items.map((it) => it.start);

loadTemplateFonts();

type Theme = TickerBeatProps['theme'];

const S = 1080;
const M = 88;
const CHAR = 0.7;
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Intro band stack, in stack coordinates.
const BAND_SIZE = 168;
const BAND_LINE = BAND_SIZE * 0.92;
const PITCH = 190;
const ACCENT_H = 195;
const BAND_W = 1800;
const ROW_W = 1900;
const ROW_X = -410;
const TILT = -9;
const TH = (TILT * Math.PI) / 180;
const FIELD = 1600;

// Board grid.
const HEAD = 40;
const RULE = 6;
const NUM_COL = 110;
const FLAP_W = S - 2 * M - NUM_COL;
const BUDGET = 652;

// CTA band.
const BAND_TOP = 822;
const BAND_H = 140;
const CTA_BAND_SIZE = 84;
const CTA_LINE = CTA_BAND_SIZE * 0.92;

const F_STICKER = frameOf(EVENTS.sticker);
const F_KICK = frameOf(EVENTS.sticker + 1);
const F_HANDOFF = frameOf(EVENTS.boardHeadline - 1);
const F_UNFOLD = frameOf(EVENTS.boardHeadline - 0.75);
const F_CHROME = frameOf(EVENTS.boardHeadline - 0.5);
const F_BOARD = frameOf(EVENTS.boardHeadline);
const F_FLOOD = frameOf(SCENES.cta.from - 1);
const FLOOD_LEN = 11;
const F_CTA_BRAND = frameOf(EVENTS.ctaBrand);
const RISE = 8;
const F_STAMP = frameOf(EVENTS.ctaStamp);
const F_COLLAPSE = DURATION - 8;
const HOLD_BEATS = [EVENTS.ctaStamp + 1, EVENTS.ctaStamp + 2];
const SEGMENTS = SCENES.list.beats;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (f: number, a: number, b: number, easing = easeOut) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

type Rect = {cx: number; cy: number; w: number; h: number; rot: number};
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  rot: lerp(a.rot, b.rot, t),
});
const corners = (r: Rect) => {
  const t = (r.rot * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const x = (sx * r.w) / 2;
    const y = (sy * r.h) / 2;
    return [r.cx + x * c - y * s, r.cy + x * s + y * c];
  });
};
const pts = (p: number[][]) => p.map(([x, y]) => `${x}px ${y}px`).join(', ');

// Largest size where the words wrap into at most `lines` rows.
function fitLines(text: string, max: number, width: number, lines: number, ratio: number, min: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wrap = (per: number) => {
    const rows: string[] = [];
    for (const w of words) {
      const last = rows[rows.length - 1];
      if (last !== undefined && last.length + 1 + w.length <= per) rows[rows.length - 1] = `${last} ${w}`;
      else rows.push(w);
    }
    return rows.length ? rows : [''];
  };
  for (let size = max; size > min; size -= 2) {
    const per = Math.floor(width / (size * ratio));
    if (words.some((w) => w.length > per)) continue;
    const rows = wrap(per);
    if (rows.length <= lines) return {size, rows};
  }
  const joined = words.join(' ');
  return {size: Math.min(min, width / (Math.max(1, joined.length) * ratio)), rows: [joined]};
}

// One endless band of repeated text. Each unit is a fixed-width box so the loop is seamless.
const Band: React.FC<{text: string; role: string; size: number; color: string; dir: 1 | -1; speed: number; outline?: boolean; shift?: number}> = ({
  text,
  role,
  size,
  color,
  dir,
  speed,
  outline,
  shift = 0,
}) => {
  const frame = useCurrentFrame();
  const unitWidth = Math.max(1, text.length) * size * 0.84 + size * 1.8;
  const travel = ((((frame * speed + shift) * dir) % unitWidth) + unitWidth) % unitWidth;
  const count = Math.ceil(2800 / unitWidth) + 2;
  return (
    <div
      style={{
        display: 'flex',
        whiteSpace: 'pre',
        fontFamily: DISPLAY,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 0.92,
        textTransform: 'uppercase',
        transform: `translateX(${travel - unitWidth}px)`,
        color: outline ? 'transparent' : color,
        WebkitTextStroke: outline ? `${Math.max(2, size / 50)}px ${color}` : undefined,
      }}
    >
      {Array.from({length: count}, (_, k) => (
        <div key={k} style={{position: 'relative', flex: 'none', width: unitWidth}}>
          {/* Scrolling copies stay tappable but are decorative for the direction gates. */}
          <span data-text-role={role} data-text-copy="" style={{display: 'contents'}}>{text}</span>
          <span style={{position: 'absolute', right: size * 0.45, top: 0}}>{'\u2605'}</span>
        </div>
      ))}
    </div>
  );
};

const Chrome: React.FC<{frame: number; ink: string; dot: string; brand: string; headline: string; clip?: string}> = ({frame, ink, dot, brand, headline, clip}) => {
  const enter = interpolate(frame, [F_CHROME, F_CHROME + 8], [110, 0], {...clamp, easing: easeOut});
  const out = interpolate(frame, [F_COLLAPSE, F_COLLAPSE + 6], [0, -110], {...clamp, easing: easeIn});
  const brandY = frame < F_CTA_BRAND ? enter : interpolate(frame, [F_CTA_BRAND, F_CTA_BRAND + 8], [0, -110], {...clamp, easing: easeIn});
  const headY = frame < F_COLLAPSE ? interpolate(frame, [F_CTA_BRAND, F_CTA_BRAND + 10], [110, 0], {...clamp, easing: easeOut}) : out;
  const low = frame < F_COLLAPSE ? interpolate(frame, [F_CHROME + 2, F_CHROME + 10], [110, 0], {...clamp, easing: easeOut}) : out;
  const dotScale = frame < F_COLLAPSE ? ease(frame, F_CHROME, F_CHROME + 6) : 1 - ease(frame, F_COLLAPSE, F_COLLAPSE + 5);
  const blink = frame % BEAT < 8 ? 1 : 0.3;
  const line: React.CSSProperties = {position: 'absolute', left: 0, top: 0, lineHeight: '28px', whiteSpace: 'nowrap', textTransform: 'uppercase'};
  return (
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: MONO_FONT, fontSize: 22, fontWeight: 600, color: ink, clipPath: clip}}>
      <div style={{position: 'absolute', left: M, right: M, top: 72, height: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{position: 'relative', overflow: 'hidden', height: 28, flex: 1}}>
          {frame < F_CTA_BRAND + 8 ? (
            <div style={{...line, transform: `translateY(${brandY}%)`}}>
              <span data-text-role="brand" style={{display: 'contents'}}>{brand}</span>
            </div>
          ) : null}
          {frame >= F_CTA_BRAND ? (
            <div style={{...line, transform: `translateY(${headY}%)`}}>
              <span data-text-role="headline" style={{display: 'contents'}}>{headline}</span>
            </div>
          ) : null}
        </div>
        <div style={{width: 14, height: 14, borderRadius: 7, background: dot, transform: `scale(${dotScale})`, opacity: blink}} />
      </div>
      <div style={{position: 'absolute', left: M, right: M, bottom: 72, height: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6, overflow: 'hidden'}}>
        <span style={{display: 'block', lineHeight: '28px', transform: `translateY(${low}%)`}}>{String(frame).padStart(4, '0')}</span>
        <span style={{display: 'flex', gap: 10, transform: `translateY(${low}%)`}}>
          {[0, 1, 2].map((k) => (
            <span key={k} style={{width: 12, height: 12, background: ink}} />
          ))}
        </span>
      </div>
    </AbsoluteFill>
  );
};

type Cell = {ch: string; k: number};

// Split an item into board lines of C cells, breaking only between words.
function wrapCells(text: string, C: number): Cell[][] | null {
  const chars = text.split('');
  if (chars.length <= C) return [chars.map((ch, k) => ({ch, k}))];
  const words: {w: string; at: number}[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) words.push({w: m[0], at: m.index});
  if (words.some((w) => w.w.length > C)) return null;
  const lines: {w: string; at: number}[][] = [];
  let cur: {w: string; at: number}[] = [];
  let length = 0;
  for (const word of words) {
    if (cur.length && length + 1 + word.w.length > C) {
      lines.push(cur);
      cur = [word];
      length = word.w.length;
    } else {
      cur.push(word);
      length += (cur.length > 1 ? 1 : 0) + word.w.length;
    }
  }
  if (cur.length) lines.push(cur);
  return lines.map((ln) => {
    const cells: Cell[] = [];
    ln.forEach((word, j) => {
      if (j) cells.push({ch: ' ', k: -1});
      word.w.split('').forEach((ch, x) => cells.push({ch, k: word.at + x}));
    });
    return cells;
  });
}

function boardLayout(items: string[]) {
  const n = Math.max(1, Math.min(3, items.length)) as 1 | 2 | 3;
  const cap = {1: 170, 2: 124, 3: 100}[n];
  const maxLines = {1: 3, 2: 2, 3: 1}[n];
  const minC = {1: 4, 2: 5, 3: 8}[n];
  const rowGap = {1: 0, 2: 48, 3: 30}[n];
  const longest = Math.max(1, ...items.map((t) => t.length));
  let best: {C: number; size: number; wrapped: Cell[][][]} | null = null;
  for (let C = Math.max(16, longest); C >= minC; C--) {
    const wrapped = items.map((t) => wrapCells(t, C));
    if (wrapped.some((w) => !w || w.length > maxLines)) continue;
    const ok = wrapped as Cell[][][];
    const total = ok.reduce((s, w) => s + w.length, 0);
    const extra = total - n;
    const size = Math.min(cap, FLAP_W / (C * 0.82), (BUDGET - (n - 1) * rowGap) / (total * 1.16 + extra * 0.12));
    if (!best || size > best.size + 0.5) best = {C, size, wrapped: ok};
  }
  const C = best ? best.C : Math.max(16, longest);
  const size = best ? best.size : Math.min(cap, FLAP_W / (C * 0.82));
  const wrapped = best ? best.wrapped : items.map((t) => [t.split('').map((ch, k) => ({ch, k}))]);
  const lineH = size * 1.16;
  const lineGap = size * 0.12;
  const padded = wrapped.map((lines) =>
    lines.map((ln) => {
      const out = [...ln];
      while (out.length < C) out.push({ch: ' ', k: -1});
      return out;
    }),
  );
  const heights = padded.map((lines) => lines.length * lineH + (lines.length - 1) * lineGap);
  const rowsH = heights.reduce((s, h) => s + h, 0) + (n - 1) * rowGap;
  const total = HEAD + 26 + RULE + 36 + rowsH + 36 + 4;
  const top = (S - total) / 2;
  const ruleTop = top + HEAD + 26;
  const rowsTop = ruleTop + RULE + 36;
  const bottomTop = rowsTop + rowsH + 36;
  let y = rowsTop;
  const laid = padded.map((lines, i) => {
    const item = {lines, len: items[i].length, top: y};
    y += heights[i] + rowGap;
    return item;
  });
  const gridW = C * size * 0.82 - size * 0.08;
  const gridLeft = M + NUM_COL + Math.max(0, (FLAP_W - gridW) / 2);
  const numSize = Math.round(Math.min(48, Math.max(30, size * 0.3)));
  return {n, size, lineH, lineGap, top, ruleTop, bottomTop, gridLeft, numSize, items: laid};
}

type Layout = ReturnType<typeof boardLayout>;

const Board: React.FC<{frame: number; theme: Theme; headline: string; beats: number[]; lay: Layout}> = ({frame, theme, headline, beats, lay}) => {
  const unfoldSeg = ease(frame, F_BOARD, F_BOARD + 8);
  const n = lay.items.length;
  const settleOffs = lay.items.map((_, i) => Math.min(FLAP_FRAMES, frameOf(beats[i] + SETTLE) - frameOf(beats[i])));
  // From the first settle, a reader marker steps to the next settled row on every beat,
  // so each beat lands on the board while the rows themselves stay still.
  const firstSettle = frameOf(beats[0]) + settleOffs[0];
  const holdStart = Math.ceil(firstSettle / BEAT) * BEAT;
  const k = Math.floor((frame - holdStart) / BEAT);
  const local = frame - holdStart - k * BEAT;
  const settledAt = (f: number) => lay.items.filter((_, i) => f >= frameOf(beats[i]) + settleOffs[i]).length;
  const size = lay.size;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: M,
          top: lay.top,
          height: HEAD,
          display: 'flex',
          alignItems: 'flex-end',
          fontFamily: MONO_FONT,
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.1,
          color: theme.accent,
          textTransform: 'uppercase',
          whiteSpace: 'pre',
        }}
      >
        <span data-text-role="headline" style={{display: 'contents'}}>
          {headline.split('').map((ch, i) => {
            const y = interpolate(frame - F_BOARD - i * 0.35, [0, 6], [110, 0], {...clamp, easing: easeOut});
            return (
              <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom'}}>
                <span style={{display: 'inline-block', transform: `translateY(${y}%)`}}>{ch}</span>
              </span>
            );
          })}
        </span>
      </div>
      <div style={{position: 'absolute', right: M, top: lay.top + 14, display: 'flex', gap: 8, transform: `scaleY(${unfoldSeg})`, transformOrigin: '50% 0%'}}>
        {Array.from({length: SEGMENTS}, (_, s) => {
          const at = frameOf(EVENTS.boardHeadline + s);
          const g = ease(frame, at, at + 6);
          return (
            <div key={s} style={{width: 18, height: 18, background: theme.surface, position: 'relative'}}>
              <div style={{position: 'absolute', inset: 0, background: theme.accent, transform: `scale(${g})`}} />
            </div>
          );
        })}
      </div>
      {lay.items.map((item, i) => {
        const start = frameOf(beats[i]);
        const settleOff = settleOffs[i];
        const t = frame - start;
        const settled = t >= settleOff;
        const ink = i === 1 ? theme.accent2 : theme.foreground;
        const numY = interpolate(frame, [F_UNFOLD + i * 2, F_UNFOLD + i * 2 + 7], [110, 0], {...clamp, easing: easeOut});
        const grow = ease(t - settleOff, 0, 6);
        let active = 0;
        if (frame >= holdStart) {
          // Step through the rows settled at each beat; one row alone pulses on the beat.
          const ready = Math.max(1, settledAt(holdStart + k * BEAT));
          const prevReady = Math.max(1, settledAt(holdStart + (k - 1) * BEAT));
          const cur = k % ready;
          const prev = (k - 1 + prevReady) % prevReady;
          const e = ease(local, 0, 6);
          active = ready === 1 ? (i === 0 ? 1 - 0.6 * Math.exp(-local / 4) : 0) : (i === cur ? e : 0) + (k > 0 && i === prev && prev !== cur ? 1 - e : 0);
        }
        const barW = 18 * grow + 30 * active;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: M, top: item.top, height: lay.lineH, display: 'flex', alignItems: 'center', overflow: 'hidden'}}>
              <span
                style={{
                  display: 'block',
                  fontFamily: MONO_FONT,
                  fontSize: lay.numSize,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: settled ? theme.accent : mix(theme.foreground, 45),
                  transform: `translateY(${numY}%)`,
                }}
              >
                {`0${i + 1}`}
              </span>
            </div>
            <div style={{position: 'absolute', left: M, top: item.top + lay.lineH / 2 + lay.numSize * 0.66, width: barW, height: 4, background: theme.accent}} />
            <span data-text-role="list" data-list-item={i} style={{display: 'contents'}}>
              {item.lines.map((cells, li) => (
                <div key={li} style={{position: 'absolute', left: lay.gridLeft, top: item.top + li * (lay.lineH + lay.lineGap), display: 'flex', gap: size * 0.08}}>
                  {cells.map((cell, c) => {
                    const settleAt = cell.k < 0 ? 0 : item.len > 1 ? 4 + (settleOff - 4) * (cell.k / (item.len - 1)) : settleOff;
                    const spinning = t >= 0 && t < settleAt && cell.ch.trim() !== '';
                    const shown = t < 0 ? '' : spinning ? GLYPHS[Math.floor(random(`tickerbeat-${i}-${li}-${c}-${frame}`) * GLYPHS.length)] : cell.ch;
                    const u = ease(frame - F_UNFOLD - i - li * 1.5 - c * 0.2, 0, 7);
                    return (
                      <div
                        key={c}
                        style={{
                          position: 'relative',
                          width: size * 0.74,
                          height: lay.lineH,
                          borderRadius: size * 0.08,
                          background: theme.surface,
                          overflow: 'hidden',
                          transform: `scaleY(${u})`,
                          transformOrigin: '50% 0%',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: MONO_FONT,
                            fontSize: size * 0.86,
                            fontWeight: 800,
                            lineHeight: 1,
                            textTransform: 'uppercase',
                            color: spinning ? mix(ink, 55) : ink,
                          }}
                        >
                          {shown}
                        </div>
                        {spinning ? (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: 0,
                              height: '50%',
                              background: theme.surface,
                              transform: `scaleY(${1 - (t % 3) / 3})`,
                              transformOrigin: '50% 100%',
                            }}
                          />
                        ) : null}
                        <div style={{position: 'absolute', left: 0, right: 0, top: lay.lineH / 2 - Math.max(1, size * 0.015), height: Math.max(2, size * 0.03), background: theme.background}} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </span>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const Ticker: React.FC<TickerBeatProps> = (props) => {
  const {texts, theme} = props;
  const frame = useCurrentFrame();
  const brand = texts.brand ?? '';
  const headline = texts.headline ?? '';
  const cta = texts.cta ?? '';
  const listed = listItems(props).slice(0, 3);
  const items = listed.length ? listed : [''];
  const beats = itemBeats(items.length);
  const lay = boardLayout(items);

  // Wrapped time: the last 8 frames lead straight into frame 0.
  const fw = frame >= F_COLLAPSE ? frame - DURATION : frame;
  const Z = fw < 8
    ? interpolate(fw, [-8, 8], [1.4, 1.16], {...clamp, easing: easeOut})
    : interpolate(fw, [8, F_BOARD], [1.16, 1.08], clamp);

  // The accent object: tilted band -> board rule -> CTA field -> tilted band.
  const bandRect: Rect = {cx: S / 2 + PITCH * Z * Math.sin(TH), cy: S / 2 - PITCH * Z * Math.cos(TH), w: BAND_W * Z, h: ACCENT_H * Z, rot: TILT};
  const ruleRect: Rect = {cx: S / 2, cy: lay.ruleTop + RULE / 2, w: S - 2 * M, h: RULE, rot: 0};
  const fieldRect: Rect = {cx: S / 2, cy: S / 2, w: FIELD, h: FIELD, rot: 0};
  let acc: Rect;
  if (frame < F_HANDOFF) acc = bandRect;
  else if (frame < F_FLOOD) acc = lerpRect(bandRect, ruleRect, ease(frame, F_HANDOFF, F_HANDOFF + 12));
  else if (frame < F_COLLAPSE) acc = lerpRect(ruleRect, fieldRect, ease(frame, F_FLOOD, F_FLOOD + FLOOD_LEN));
  else acc = lerpRect(fieldRect, bandRect, ease(frame, F_COLLAPSE, DURATION));
  const accPts = corners(acc);
  const insidePoly = `polygon(${pts(accPts)})`;
  const outsidePoly = `polygon(evenodd, 0px 0px, ${S}px 0px, ${S}px ${S}px, 0px ${S}px, 0px 0px, ${pts(accPts)}, ${pts([accPts[0]])})`;

  // Band stack rows.
  const kick = frame < F_COLLAPSE ? 180 * ease(frame, F_KICK, F_KICK + 10) : 0;
  const bands = [
    {color: theme.foreground, outline: true},
    {color: theme.background, outline: false},
    {color: theme.foreground, outline: false},
    {color: theme.accent2, outline: true},
    {color: theme.foreground, outline: false},
  ];
  const rowNode = (i: number) => {
    const e = ease(fw, -6 + i, 5 + i);
    const x = frame >= F_HANDOFF && frame < F_COLLAPSE ? ease(frame, F_HANDOFF + i, F_HANDOFF + 11 + i, easeIn) : 0;
    const fromRight = i % 2 === 0;
    const l = fromRight ? (1 - e) * ROW_W : x * ROW_W;
    const r = fromRight ? x * ROW_W : (1 - e) * ROW_W;
    const off = (1 - e) * (fromRight ? 260 : -260);
    const b = bands[i];
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: ROW_X,
          top: S / 2 + (i - 2) * PITCH - BAND_LINE / 2,
          width: ROW_W,
          height: BAND_LINE,
          overflow: 'hidden',
          clipPath: `inset(0px ${r}px 0px ${l}px)`,
        }}
      >
        <div style={{transform: `translateX(${off}px)`}}>
          <Band text={headline} role="headline" size={BAND_SIZE} dir={i % 2 ? 1 : -1} speed={7 + i * 1.5} color={b.color} outline={b.outline} shift={kick} />
        </div>
      </div>
    );
  };
  const stackOn = frame < F_BOARD || frame >= F_COLLAPSE;
  const stackTransform = `rotate(${TILT}deg) scale(${Z})`;

  // Sticker: falls into contact on its beat, one small squash, then peels away.
  const stIn = interpolate(frame, [F_STICKER - 4, F_STICKER], [0, 1], {...clamp, easing: easeIn});
  const stDip = interpolate(frame, [F_STICKER, F_STICKER + 2, F_STICKER + 6], [1, 0.96, 1], clamp);
  const peel = interpolate(frame, [F_HANDOFF, F_HANDOFF + 10], [0, 100], {...clamp, easing: easeIn});
  const sticker = fitLines(brand.toUpperCase(), 124, 700, 2, CHAR, 40);

  // Bottom rule that becomes the CTA band.
  const bp = ease(frame, F_BOARD - 8, F_BOARD);
  const bq = ease(frame, F_FLOOD, F_FLOOD + 12);
  const bL = lerp(M, 0, bq);
  const bR = lerp(M + (S - 2 * M) * bp, S, bq);
  const bT = lerp(lay.bottomTop, BAND_TOP, bq);
  const bH = lerp(4, BAND_H, bq);
  const bandTextY = interpolate(frame, [F_CTA_BRAND - RISE, F_CTA_BRAND], [BAND_H, 0], {...clamp, easing: easeOut});
  const bandKick = 140 * ease(frame, F_STAMP, F_STAMP + 14);
  const impact = lerp(50, 0, ease(frame, F_STAMP, F_STAMP + 9));

  // CTA lockup.
  const ctaBrand = fitLines(brand.toUpperCase(), 176, 880, 2, CHAR, 60);
  const ctaSize = fit(cta.toUpperCase(), 54, 600, CHAR);
  const brandLineH = ctaBrand.size * 0.95;
  const brandH = ctaBrand.rows.length * brandLineH;
  const pillH = ctaSize + 56;
  const blockTop = 455 - (brandH + 64 + pillH) / 2;
  const pillTop = blockTop + brandH + 64;
  const brandY = frame < F_COLLAPSE
    ? interpolate(frame, [F_CTA_BRAND - RISE, F_CTA_BRAND], [110, 0], {...clamp, easing: easeOut})
    : interpolate(frame, [F_COLLAPSE, F_COLLAPSE + 5], [0, 110], {...clamp, easing: easeIn});
  const pIn = interpolate(frame, [F_STAMP - 4, F_STAMP], [0, 1], {...clamp, easing: easeIn});
  const pDip = interpolate(frame, [F_STAMP, F_STAMP + 2, F_STAMP + 6], [1, 0.965, 1], clamp);
  const pillScale = lerp(1.8, 1, pIn) * pDip;
  const pillRot = lerp(-12, -3, pIn);
  const nudge = HOLD_BEATS.reduce((sum, b) => {
    const kk = (frame - frameOf(b)) / 10;
    return kk >= 0 && kk <= 1 ? sum + Math.sin(Math.PI * kk) * 10 : sum;
  }, 0);

  return (
    <AbsoluteFill style={{fontFamily: DISPLAY, overflow: 'hidden', background: theme.background}}>
      {frame >= F_HANDOFF && frame <= F_FLOOD + FLOOD_LEN ? (
        <Board frame={frame} theme={theme} headline={headline} beats={beats} lay={lay} />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: acc.cx - acc.w / 2,
          top: acc.cy - acc.h / 2,
          width: acc.w,
          height: acc.h,
          background: theme.accent,
          transform: `rotate(${acc.rot}deg)`,
        }}
      />

      {stackOn ? (
        <AbsoluteFill style={{clipPath: outsidePoly}}>
          <AbsoluteFill style={{transform: stackTransform}}>{[0, 2, 3, 4].map(rowNode)}</AbsoluteFill>
        </AbsoluteFill>
      ) : null}
      {stackOn ? (
        <AbsoluteFill style={{clipPath: insidePoly}}>
          <AbsoluteFill style={{transform: stackTransform}}>{rowNode(1)}</AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {frame >= F_BOARD - 8 ? (
        <AbsoluteFill style={{clipPath: frame >= F_COLLAPSE ? insidePoly : undefined}}>
          <div style={{position: 'absolute', left: bL, top: bT, width: Math.max(0, bR - bL), height: bH, background: theme.surface, overflow: 'hidden'}}>
            {frame >= F_CTA_BRAND - RISE ? (
              <div style={{position: 'absolute', left: -bL, top: bH / 2 - CTA_LINE / 2 + bandTextY, width: S}}>
                <Band text={cta} role="cta" size={CTA_BAND_SIZE} color={theme.accent2} dir={-1} speed={6} shift={bandKick} />
              </div>
            ) : null}
            {frame >= F_STAMP ? (
              <div style={{position: 'absolute', inset: 0, background: theme.accent2, clipPath: `inset(0% ${impact}% 0% ${impact}%)`, overflow: 'hidden'}}>
                <div style={{position: 'absolute', left: -bL, top: bH / 2 - CTA_LINE / 2, width: S}}>
                  <Band text={cta} role="cta" size={CTA_BAND_SIZE} color={theme.background} dir={-1} speed={6} shift={bandKick} />
                </div>
              </div>
            ) : null}
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= F_STICKER - 4 && frame < F_HANDOFF + 11 ? (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'relative',
              padding: '0 14px 14px 0',
              transform: `scale(${lerp(1.7, 1, stIn) * stDip}) rotate(${lerp(-16, -4, stIn)}deg)`,
              clipPath: `inset(0% 0% ${peel}% 0%)`,
            }}
          >
            <div style={{position: 'absolute', left: 14, top: 14, right: 0, bottom: 0, background: theme.foreground, borderRadius: 6}} />
            <div
              style={{
                position: 'relative',
                padding: '34px 58px 38px',
                background: theme.accent2,
                color: theme.background,
                borderRadius: 6,
                fontSize: sticker.size,
                fontWeight: 900,
                lineHeight: 0.95,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              <span data-text-role="brand" style={{display: 'contents'}}>
                {sticker.rows.map((row, r) => (
                  <div key={r}>{row}</div>
                ))}
              </span>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= F_CTA_BRAND - RISE ? (
        <AbsoluteFill style={{clipPath: insidePoly}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: blockTop, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <span data-text-role="brand" style={{display: 'contents'}}>
              {ctaBrand.rows.map((row, r) => (
                <div key={r} style={{overflow: 'hidden', height: brandLineH, padding: '0 12px'}}>
                  <div
                    style={{
                      fontSize: ctaBrand.size,
                      fontWeight: 900,
                      lineHeight: 0.95,
                      color: theme.background,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      transform: `translateY(${brandY}%)`,
                    }}
                  >
                    {row}
                  </div>
                </div>
              ))}
            </span>
          </div>
          {frame >= F_STAMP - 4 ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: pillTop, display: 'flex', justifyContent: 'center'}}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  height: pillH,
                  padding: '0 48px',
                  borderRadius: 999,
                  background: theme.background,
                  color: theme.accent2,
                  fontSize: ctaSize,
                  fontWeight: 900,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transform: `scale(${pillScale}) rotate(${pillRot}deg)`,
                }}
              >
                <span data-text-role="cta" style={{display: 'contents'}}>{cta}</span>
                <span style={{display: 'flex', transform: `translateX(${nudge}px)`}}>
                  <ArrowIcon size={Math.round(ctaSize * 0.9)} />
                </span>
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}

      {frame >= F_CHROME && frame < F_FLOOD + FLOOD_LEN ? (
        <Chrome frame={frame} ink={theme.foreground} dot={theme.accent} brand={brand} headline={headline} clip={frame >= F_FLOOD ? outsidePoly : undefined} />
      ) : null}
      {frame >= F_FLOOD ? (
        <Chrome frame={frame} ink={theme.background} dot={theme.background} brand={brand} headline={headline} clip={insidePoly} />
      ) : null}

      <Grain />
    </AbsoluteFill>
  );
};
