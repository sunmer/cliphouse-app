CONCEPT: One square is the metronome. It stretches into a bar, the bar floods into a field, the field splits into three bands, the bands slam back into one brand slab, and the slab folds back into the bar and the square.

REVIEW (v3 render):
- **Cut off:** The last word of the headline ("MOVE") and the last letter of the brand ("LOUDHOUSE") are clipped at the right edge. The 0.7 width ratio underestimates the wide uppercase glyphs. All display type now uses a 0.88 ratio.
- **Weak finale:** The last third was the quietest part of the piece: a thin bar on black with small type. The strongest moment sat in the middle. The three bands now collapse into a full-bleed accent slab, and the brand slams up inside it at frame 180.
- **Empty frame:** Frame 180 was empty (only a bar on black). The slab now fills it, and the brand is already rising.
- **Clutter:** The reader square sat at mid-row height, right against the end of the point words ("LOUDER ·"). At 16 characters it would overlap the text. The square now reads on the label line, opposite the 01/02/03 numerals.
- **Hard to read:** The 22 px row numerals were too small to read. They are now 24 px.
- **Off the beat:** The end screen had nothing landing on beats 225 and 240. The loop timer now fills in four steps, one per beat (195, 210, 225, 240).
- **Rough handoff:** The square crossed the subhead on its way to becoming the CTA. It now travels to the CTA position while the bands collapse, before the subhead exists.
- **Unbalanced layout:** The bar moved up to y=600. The headline now sits nearer the middle of the frame, and the end screen balances slab, subhead and CTA.
- **Short hold:** The CTA was readable for only about 30 frames. It now enters earlier and holds for at least 34 frames.

BEATS:
0–14: A lone foreground square pulls an accent bar out to the full grid width.
15: The first headline word rises out of its mask, standing on the bar.
30: The next headline words rise on a stagger, and the last word lands by frame 42.
45: The square hops one third along the bar.
60: The square hops two thirds along the bar.
75: The square reaches the right end. The bar floods from itself to every corner (frames 76–88).
90: The square climbs to the 01 label line. POINT1 rises letter by letter out of the field.
105: The square drops to 02 and a foreground band bursts out of it. POINT2 rises.
120: The square drops to 03 and an accent2 band bursts out of it. POINT3 rises.
135: The square reads 01.
150: The square reads 02.
165: The square reads 03. All three bands slam shut into one full-bleed accent slab (frames 165–178).
180: The BRAND rises letter by letter inside the slab. This is the hero moment.
195: The SUBHEAD rises word by word, and timer step 1 fills along the slab's base.
210: The square stretches into the CTA block and the CTA text rises inside it. Timer step 2 fills.
225: Timer step 3 fills while the final message holds still.
240: Timer step 4 fills.
252–269: The brand sinks into the slab and the subhead lifts out. The CTA folds into the square, the slab thins to the bar, and the bar retracts into the square, which matches frame 0.

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
  posterFrame: 236,
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
const BAR_Y = 600;
const BAR_H = 28;
const T = 28; // the square / tick
const GAP = 28;
const ROW_H = W / 3;
const R = 0.88; // width ratio for heavy uppercase display type
const rowTop = (i: number) => PAD + i * ROW_H;
const rowMid = (i: number) => rowTop(i) + ROW_H / 2;
const labelY = (i: number) => rowTop(i) + 30;
const SUB_Y = BAR_Y + BAR_H + 44;
const CTA_Y = 900;
const CTA_H = 96;
const CTA_SIZE = 40;

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
  const EXIT = END - 18;
  const SHRINK = END - 17;
  const RETRACT = END - 9;

  // ---------- brand / slab geometry ----------
  const brandUp = texts.brand.toUpperCase();
  const bChars = [...texts.brand];
  const bs = Math.min(fit(brandUp, 190, W, R), 190);
  const bLh = bs * 1.02;
  const SLAB_PAD = 56;
  const SLAB_H = Math.round(bLh + SLAB_PAD * 2 + BAR_H);
  const slabTop = BAR_Y + BAR_H - SLAB_H;
  const brandTop = slabTop + SLAB_PAD;

  // ---------- shapes ----------
  const sq: Rect = {x: PAD, y: BAR_Y, w: T, h: BAR_H};
  const bar: Rect = {x: PAD, y: BAR_Y, w: W, h: BAR_H};
  const full: Rect = {x: 0, y: 0, w: S, h: S};
  const slab: Rect = {x: 0, y: slabTop, w: S, h: SLAB_H};
  const accentRect =
    frame < FLOOD
      ? lerpRect(sq, bar, prog(frame, A, 14))
      : frame < COLLAPSE
        ? lerpRect(bar, full, prog(frame, FLOOD, 12))
        : frame < SHRINK
          ? lerpRect(full, slab, prog(frame, COLLAPSE, 13))
          : frame < RETRACT
            ? lerpRect(slab, bar, prog(frame, SHRINK, 8, easeInOut))
            : lerpRect(bar, sq, prog(frame, RETRACT, 8, easeInOut));

  const closed: Rect = {x: 0, y: slabTop + SLAB_H / 2, w: S, h: 0};
  const band = (i: number, growAt: number): Rect | null => {
    if (frame < growAt) return null;
    const seed: Rect = {x: S - PAD - T, y: labelY(i), w: T, h: T};
    const target: Rect = i === 1 ? {x: 0, y: rowTop(1), w: S, h: ROW_H + 1} : {x: 0, y: rowTop(2), w: S, h: S - rowTop(2)};
    if (frame < COLLAPSE) return lerpRect(seed, target, prog(frame, growAt, 10));
    return lerpRect(target, closed, prog(frame, COLLAPSE, 13));
  };

  const cta = texts.cta;
  const ctaW = Math.min(W, Math.round(cta.length * CTA_SIZE * 0.62 + 80 + 34 + 28));
  const third = (W - T) / 3;
  const ctaSq = CTA_Y + CTA_H / 2 - T / 2;
  const tick = keyed(frame, sq, [
    [A + 38, 7, {x: PAD + third}],
    [A + 53, 7, {x: PAD + third * 2}],
    [A + 68, 7, {x: S - PAD - T}],
    [B - 10, 7, {y: labelY(0)}],
    [B + 1, 7, {y: labelY(1)}],
    [B + 16, 7, {y: labelY(2)}],
    [B + 38, 7, {y: labelY(0)}],
    [B + 53, 7, {y: labelY(1)}],
    [B + 68, 7, {y: labelY(2)}],
    [COLLAPSE, 13, {x: PAD, y: ctaSq}],
    [C + 22, 10, {y: CTA_Y, w: ctaW, h: CTA_H}],
    [END - 16, 7, {y: ctaSq, w: T, h: T}],
    [RETRACT, 8, {y: BAR_Y, h: BAR_H}],
  ]);
  const tickColor = frame >= B - 6 && frame < COLLAPSE + 4 ? theme.background : theme.foreground;

  // ---------- headline ----------
  const hWords = texts.headline.trim().split(/\s+/);
  const hs0 = wrapFit(texts.headline.toUpperCase(), 170, W, 3, R, 48);
  const hLines = wrapLines(hWords, hs0, W, R);
  const hMax = Math.max(...hLines.map((l) => l.join(' ').length));
  const hs = Math.min(hs0, W / (hMax * R), (BAR_Y - GAP - PAD) / (hLines.length * 1.02));
  const hLh = hs * 1.02;
  const hSpacing = hWords.length > 1 ? Math.min(15, 20 / (hWords.length - 1)) : 0;
  const hOffsets = hLines.map((_, li) => hLines.slice(0, li).reduce((n, l) => n + l.length, 0));

  // ---------- points ----------
  const points = [texts.point1, texts.point2, texts.point3];
  const pStarts = [B - 6, B + 10, B + 25];
  const ps = Math.min(...points.map((p) => fit(p.trim().toUpperCase(), 190, W - 40, R)), ROW_H * 0.56);
  const renderPoint = (i: number) => {
    const chars = [...points[i]];
    const stag = chars.length > 1 ? Math.min(1.5, 8 / (chars.length - 1)) : 0;
    return (
      <>
        <div style={{position: 'absolute', left: PAD, top: labelY(i), height: 28, overflow: 'hidden', fontFamily: MONO_FONT, fontSize: 24, fontWeight: 700, lineHeight: '28px', color: theme.background}}>
          <span style={{display: 'inline-block', transform: rise(prog(frame, pStarts[i], 9))}}>{`0${i + 1}`}</span>
        </div>
        <div style={{position: 'absolute', left: PAD, top: rowMid(i) - ps * 0.51 + 10, width: W, height: ps * 1.02, overflow: 'hidden', whiteSpace: 'pre', fontFamily: DISPLAY, fontWeight: 900, fontSize: ps, lineHeight: `${ps * 1.02}px`, letterSpacing: '-0.02em', textTransform: 'uppercase', color: theme.background}}>
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

  // ---------- brand timing ----------
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
  const cStart = C + 26;
  const cStag = cWords.length > 1 ? Math.min(2, 4 / (cWords.length - 1)) : 0;

  // Loop timer fills one quarter on each beat of the end screen.
  const timer = [0, 1, 2, 3].reduce((n, k) => n + prog(frame, C + 15 + k * 15, 8) / 4, 0);

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
                    <span style={{display: 'inline-block', transform: rise(prog(frame, A + 12 + (hOffsets[li] + wi) * hSpacing, 10))}}>{word}</span>
                  </React.Fragment>
                ))}
                {li < hLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Subhead hangs below the slab */}
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
                      <span style={{display: 'inline-block', transform: rise(prog(frame, C + 12 + k * sStag, 10), prog(frame, EXIT + k * sExit, 8, easeIn), -1)}}>{word}</span>
                    </React.Fragment>
                  );
                })}
                {li < sLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* The accent bar / field / slab: holds point 1, the brand, and the loop timer */}
      <Layer rect={accentRect} color={theme.accent}>
        {frame < COLLAPSE + 13 && renderPoint(0)}
        {frame >= C - 2 && (
          <div style={{position: 'absolute', left: PAD, width: W, top: brandTop, height: bLh, overflow: 'hidden', whiteSpace: 'pre', fontFamily: DISPLAY, fontWeight: 900, fontSize: bs, lineHeight: `${bLh}px`, letterSpacing: '-0.02em', textTransform: 'uppercase', color: theme.background}}>
            <span data-text-role="brand">
              {bChars.map((ch, i) => (
                <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: rise(prog(frame, C + i * bStag, 10), prog(frame, EXIT + i * bExit, 8, easeIn), 1)}}>
                  {ch}
                </span>
              ))}
            </span>
          </div>
        )}
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