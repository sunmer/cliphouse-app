CONCEPT: One square is the metronome. It stretches into a bar, the bar floods into a field, the field splits into three bands, the bands fold back into the bar, and the square returns.

BEATS:
0–14: A lone foreground square at the left margin pulls an accent bar out to the full grid width.
15: The first headline word rises out of its mask, standing on the bar.
30: The next headline words rise in on a 7–15 frame stagger.
45: The last headline word lands. The square hops one third along the bar.
60: The square hops two thirds along the bar.
75: The square reaches the right end. The bar floods from itself to every corner (frames 76–88).
90: The square climbs into row 1. POINT1 rises letter by letter out of the red field (frames 84–94).
105: The square drops to row 2 and a foreground band bursts out of it. POINT2 rises (frames 98–110).
120: The square drops to row 3 and an accent2 band bursts out of it. POINT3 rises (frames 113–125).
135: The square reads row 1.
150: The square reads row 2.
165: The square reads row 3. All three bands shutter shut into the original bar (frames 165–178).
180: The BRAND rises letter by letter out of the bar. This is the hero moment.
195: The SUBHEAD rises word by word below the bar.
210: The square drops and stretches into the CTA block. The CTA text rises inside it (frames 207–223).
225: An accent2 timer starts filling the bar. The final message is held still.
240: The timer keeps filling and the message stays still.
255–269: The brand sinks into the bar, the subhead lifts out, and the CTA folds back into the square. The bar retracts into the square, which matches frame 0.

FILE: meta.ts
```ts
import type {TemplateMeta} from '../vocab.ts';

export const kineticMeta: TemplateMeta = {
  id: 'kinetic',
  name: 'Kinetic',
  width: 1080,
  height: 1080,
  fps: 30,
  durationInFrames: 270,
  posterFrame: 140,
  motion: ['Kinetic type', 'Mask reveal', 'Wipes', 'Stagger list'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 90, focus: 50, roles: ['headline']},
    {type: 'list', from: 90, duration: 90, focus: 50, roles: ['point1', 'point2', 'point3']},
    {type: 'end-screen', from: 180, duration: 90, focus: 50, roles: ['subhead', 'brand', 'cta']},
  ],
};
```

FILE: Kinetic.tsx
```tsx
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ArrowIcon, clamp, easeIn, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {kineticMeta} from './meta';
import type {KineticProps} from './schema';

loadTemplateFonts();

// Grid
const S = 1080;
const PAD = 80;
const W = S - PAD * 2;
const BAR_Y = 640;
const BAR_H = 24;
const T = 24; // the square / tick
const GAP = 28;
const ROW_H = W / 3;
const rowTop = (i: number) => PAD + i * ROW_H;
const rowMid = (i: number) => rowTop(i) + ROW_H / 2;
const SUB_Y = BAR_Y + BAR_H + 40;
const CTA_Y = 908;
const CTA_H = 92;
const CTA_SIZE = 38;

type Rect = {x: number; y: number; w: number; h: number};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});
const prog = (f: number, start: number, dur: number, easing = easeOut) =>
  interpolate(f, [start, start + dur], [0, 1], {...clamp, easing});

type Key = [at: number, dur: number, to: Partial<Rect>];
function keyed(f: number, init: Rect, keys: Key[]): Rect {
  let cur = init;
  for (const [at, dur, to] of keys) {
    if (f < at) break;
    const next = {...cur, ...to};
    const t = prog(f, at, dur);
    if (t < 1) return lerpRect(cur, next, t);
    cur = next;
  }
  return cur;
}

function wrapLines(words: string[], size: number, width: number, ratio: number) {
  const per = Math.max(1, Math.floor(width / (size * ratio)));
  const lines: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const w of words) {
    if (cur.length && len + 1 + w.length > per) {
      lines.push(cur);
      cur = [w];
      len = w.length;
    } else {
      len += (cur.length ? 1 : 0) + w.length;
      cur.push(w);
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// A flat color field clipped to an animated rectangle. Children use frame coordinates.
const Layer: React.FC<{rect: Rect | null; color: string; children?: React.ReactNode}> = ({rect, color, children}) => {
  if (!rect || rect.w <= 0.05 || rect.h <= 0.05) return null;
  const r = S - rect.x - rect.w;
  const b = S - rect.y - rect.h;
  return (
    <AbsoluteFill style={{background: color, clipPath: `inset(${rect.y}px ${r}px ${b}px ${rect.x}px)`}}>{children}</AbsoluteFill>
  );
};

const rise = (tin: number, tout = 0, dir = 1) => `translateY(${(1 - tin) * 110 + tout * 110 * dir}%)`;

export const Kinetic: React.FC<KineticProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const [sA, sB, sC] = kineticMeta.scenes;
  const A = sA.from;
  const B = sB.from;
  const C = sC.from;
  const END = kineticMeta.durationInFrames;
  const FLOOD = B - 14;
  const COLLAPSE = B + 75;
  const RETRACT = END - 12;
  const EXIT = END - 14;

  // ---------- shapes ----------
  const sq: Rect = {x: PAD, y: BAR_Y, w: T, h: BAR_H};
  const bar: Rect = {x: PAD, y: BAR_Y, w: W, h: BAR_H};
  const full: Rect = {x: 0, y: 0, w: S, h: S};
  const accentRect =
    frame < FLOOD
      ? lerpRect(sq, bar, prog(frame, A, 14))
      : frame < COLLAPSE
        ? lerpRect(bar, full, prog(frame, FLOOD, 12))
        : frame < RETRACT
          ? lerpRect(full, bar, prog(frame, COLLAPSE, 13))
          : lerpRect(bar, sq, prog(frame, RETRACT, 11, easeInOut));

  const closed: Rect = {x: PAD, y: BAR_Y + BAR_H / 2, w: W, h: 0};
  const band = (i: number, growAt: number): Rect | null => {
    if (frame < growAt) return null;
    const seed: Rect = {x: S - PAD - T, y: rowMid(i) - T / 2, w: T, h: T};
    const target: Rect = i === 1 ? {x: 0, y: rowTop(1), w: S, h: ROW_H + 1} : {x: 0, y: rowTop(2), w: S, h: S - rowTop(2)};
    if (frame < COLLAPSE) return lerpRect(seed, target, prog(frame, growAt, 10));
    return lerpRect(target, closed, prog(frame, COLLAPSE, 13));
  };

  const cta = texts.cta;
  const ctaW = Math.min(W, Math.round(cta.length * CTA_SIZE * 0.62 + 80 + 34 + 28));
  const third = (W - T) / 3;
  const tick = keyed(frame, sq, [
    [A + 38, 7, {x: PAD + third}],
    [A + 53, 7, {x: PAD + third * 2}],
    [A + 68, 7, {x: S - PAD - T}],
    [B - 10, 7, {y: rowMid(0) - T / 2}],
    [B + 1, 7, {y: rowMid(1) - T / 2}],
    [B + 16, 7, {y: rowMid(2) - T / 2}],
    [B + 38, 7, {y: rowMid(0) - T / 2}],
    [B + 53, 7, {y: rowMid(1) - T / 2}],
    [B + 68, 7, {y: rowMid(2) - T / 2}],
    [COLLAPSE, 13, {x: PAD, y: BAR_Y}],
    [C + 27, 10, {x: PAD, y: CTA_Y, w: ctaW, h: CTA_H}],
    [END - 15, 7, {y: CTA_Y + CTA_H / 2 - T / 2, w: T, h: T}],
    [END - 8, 7, {y: BAR_Y}],
  ]);
  const tickColor = frame >= B - 10 && frame < COLLAPSE + 7 ? theme.background : theme.foreground;

  // ---------- headline ----------
  const hWords = texts.headline.trim().split(/\s+/);
  const hs0 = wrapFit(texts.headline.toUpperCase(), 170, W, 3, 0.7, 56);
  const hLines = wrapLines(hWords, hs0, W, 0.7);
  const hMax = Math.max(...hLines.map((l) => l.join(' ').length));
  const hs = Math.min(hs0, W / (hMax * 0.7), (BAR_Y - GAP - PAD) / (hLines.length * 1.02));
  const hLh = hs * 1.02;
  const hSpacing = hWords.length > 1 ? Math.min(15, 20 / (hWords.length - 1)) : 0;
  const hOffsets = hLines.map((_, li) => hLines.slice(0, li).reduce((n, l) => n + l.length, 0));

  // ---------- points ----------
  const points = [texts.point1, texts.point2, texts.point3];
  const pStarts = [B - 6, B + 10, B + 25];
  const ps = Math.min(...points.map((p) => fit(p.trim(), 190, W - 60, 0.7)), ROW_H * 0.62);
  const renderPoint = (i: number) => {
    const chars = [...points[i]];
    const stag = chars.length > 1 ? Math.min(1.5, 8 / (chars.length - 1)) : 0;
    return (
      <>
        <div style={{position: 'absolute', left: PAD, top: rowTop(i) + 28, height: 28, overflow: 'hidden', fontFamily: MONO_FONT, fontSize: 22, fontWeight: 700, lineHeight: '28px', color: theme.background}}>
          <span style={{display: 'inline-block', transform: rise(prog(frame, pStarts[i], 9))}}>{`0${i + 1}`}</span>
        </div>
        <div style={{position: 'absolute', left: PAD, top: rowMid(i) - ps * 0.51, width: W - 40, height: ps * 1.02, overflow: 'hidden', whiteSpace: 'pre', fontFamily: DISPLAY, fontWeight: 900, fontSize: ps, lineHeight: `${ps * 1.02}px`, letterSpacing: '-0.02em', textTransform: 'uppercase', color: theme.background}}>
          <span data-text-role={`point${i + 1}`}>
            {chars.map((ch, c) => (
              <span key={c} style={{display: 'inline-block', whiteSpace: 'pre', transform: rise(prog(frame, pStarts[i] + c * stag, 9))}}>
                {ch}
              </span>
            ))}
          </span>
        </div>
      </>
    );
  };

  // ---------- brand ----------
  const bChars = [...texts.brand];
  const bs = Math.min(fit(texts.brand, 200, W, 0.7), (BAR_Y - GAP - PAD) / 1.02);
  const bStag = bChars.length > 1 ? Math.min(1.5, 10 / (bChars.length - 1)) : 0;
  const bExit = bChars.length > 1 ? Math.min(0.8, 4 / (bChars.length - 1)) : 0;

  // ---------- subhead ----------
  const sWords = texts.subhead.trim().split(/\s+/);
  const ss0 = wrapFit(texts.subhead, 56, W, 2, 0.54, 28);
  const sLines = wrapLines(sWords, ss0, W, 0.54);
  const sMax = Math.max(...sLines.map((l) => l.join(' ').length));
  const ss = Math.min(ss0, W / (sMax * 0.54));
  const sLh = ss * 1.25;
  const sStag = sWords.length > 1 ? Math.min(2.5, 12 / (sWords.length - 1)) : 0;
  const sExit = sWords.length > 1 ? Math.min(0.6, 4 / (sWords.length - 1)) : 0;
  const sOffsets = sLines.map((_, li) => sLines.slice(0, li).reduce((n, l) => n + l.length, 0));

  // ---------- cta ----------
  const cWords = cta.trim().split(/\s+/);
  const cStart = C + 29;
  const cStag = cWords.length > 1 ? Math.min(2, 4 / (cWords.length - 1)) : 0;

  const timer = interpolate(frame, [C + 45, END - 15], [0, 1], clamp);

  return (
    <AbsoluteFill style={{width: S, height: S, overflow: 'hidden', background: theme.background, fontFamily: DISPLAY}}>
      {/* Headline stands on the bar */}
      {frame < B && (
        <div style={{position: 'absolute', left: PAD, width: W, top: BAR_Y - GAP - hLines.length * hLh, fontFamily: DISPLAY, fontWeight: 900, fontSize: hs, lineHeight: `${hLh}px`, letterSpacing: '-0.02em', textTransform: 'uppercase', color: theme.foreground}}>
          <span data-text-role="headline" style={{display: 'block'}}>
            {hLines.map((line, li) => (
              <span key={li} style={{display: 'block', height: hLh, overflow: 'hidden', whiteSpace: 'nowrap'}}>
                {line.map((word, wi) => (
                  <React.Fragment key={wi}>
                    {wi > 0 ? ' ' : ''}
                    <span style={{display: 'inline-block', transform: rise(prog(frame, A + 15 + (hOffsets[li] + wi) * hSpacing, 10))}}>{word}</span>
                  </React.Fragment>
                ))}
                {li < hLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Brand rises out of the bar */}
      {frame >= C - 2 && (
        <div style={{position: 'absolute', left: PAD, width: W, top: BAR_Y - GAP - bs * 1.02, height: bs * 1.02, overflow: 'hidden', whiteSpace: 'pre', fontFamily: DISPLAY, fontWeight: 900, fontSize: bs, lineHeight: `${bs * 1.02}px`, letterSpacing: '-0.02em', textTransform: 'uppercase', color: theme.foreground}}>
          <span data-text-role="brand">
            {bChars.map((ch, i) => (
              <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: rise(prog(frame, C + i * bStag, 10), prog(frame, EXIT + i * bExit, 8, easeIn), 1)}}>
                {ch}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Subhead hangs below the bar */}
      {frame >= C && (
        <div style={{position: 'absolute', left: PAD, width: W, top: SUB_Y, fontFamily: DISPLAY, fontWeight: 500, fontSize: ss, lineHeight: `${sLh}px`, color: theme.foreground}}>
          <span data-text-role="subhead" style={{display: 'block'}}>
            {sLines.map((line, li) => (
              <span key={li} style={{display: 'block', height: sLh, overflow: 'hidden', whiteSpace: 'nowrap'}}>
                {line.map((word, wi) => {
                  const k = sOffsets[li] + wi;
                  return (
                    <React.Fragment key={wi}>
                      {wi > 0 ? ' ' : ''}
                      <span style={{display: 'inline-block', transform: rise(prog(frame, C + 15 + k * sStag, 10), prog(frame, EXIT + k * sExit, 8, easeIn), -1)}}>{word}</span>
                    </React.Fragment>
                  );
                })}
                {li < sLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* The accent bar / field: holds point 1 and the loop timer */}
      <Layer rect={accentRect} color={theme.accent}>
        {renderPoint(0)}
        <div style={{position: 'absolute', left: PAD, top: BAR_Y, width: W * timer, height: BAR_H, background: theme.accent2}} />
      </Layer>

      {/* Bands burst out of the square */}
      <Layer rect={band(1, B + 8)} color={theme.foreground}>
        {renderPoint(1)}
      </Layer>
      <Layer rect={band(2, B + 23)} color={theme.accent2}>
        {renderPoint(2)}
      </Layer>

      {/* The square: metronome, reader, then the CTA block */}
      <div style={{position: 'absolute', left: tick.x, top: tick.y, width: tick.w, height: tick.h, background: tickColor, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 40, top: 0, width: ctaW - 80, height: CTA_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: theme.background}}>
          <div style={{height: CTA_SIZE * 1.3, overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: 800, fontSize: CTA_SIZE, lineHeight: `${CTA_SIZE * 1.3}px`}}>
            <span data-text-role="cta">
              {cWords.map((word, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? ' ' : ''}
                  <span style={{display: 'inline-block', transform: rise(prog(frame, cStart + i * cStag, 10))}}>{word}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
          <div style={{height: 34, overflow: 'hidden', display: 'flex'}}>
            <div style={{display: 'flex', transform: rise(prog(frame, cStart + (cWords.length - 1) * cStag + 2, 10))}}>
              <ArrowIcon size={34} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```