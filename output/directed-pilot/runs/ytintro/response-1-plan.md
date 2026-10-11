CONCEPT: The channel is a progress bar. The stage collapses into a scrubber, the scrubber thickens into the name band, the playhead scrubs it to the end, and the bar floods back into the stage while the playhead becomes the call to action.

BEATS:
0–14: The full accent field (the stage) collapses into a thin scrubber bar near the bottom of the frame.
15: The scrubber lands. The accent2 playhead knob pops in with one small overshoot, with a short played trail behind it.
15–29: The bar lifts and thickens into the name band. The knob rides the band's bottom edge.
30–55: The brand rises letter by letter inside the band mask. The slow camera push begins.
45: Headline chunk 1 rises from its line mask.
60: Headline chunk 2 rises.
75: Headline chunk 3 rises.
90–100: The playhead scrubs to the middle of the band, and the accent2 trail follows it.
105–115: The playhead scrubs to the band's end.
116–127: The band floods outward to every corner (11 frames), and the headline flips color under it. This is the peak.
124–136: The playhead knob drops and opens into the CTA block.
130–145: The CTA rises by character inside the block.
146–179: The final card settles with the camera push. A thin progress line fills the CTA block and loops back to the full accent stage of frame 0.

FILE: meta.ts
```ts
import type {TemplateMeta} from '../vocab.ts';

export const ytintroMeta: TemplateMeta = {
  id: 'ytintro',
  name: 'Channel Intro',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 180,
  posterFrame: 160,
  motion: ['Progress bar', 'Mask reveal', 'Kinetic type', 'Wipes'],
  scenes: [
    {type: 'transition', from: 0, duration: 30, focus: 15, roles: []},
    {type: 'title-reveal', from: 30, duration: 86, focus: 58, roles: ['brand', 'headline']},
    {type: 'end-screen', from: 116, duration: 64, focus: 30, roles: ['brand', 'headline', 'cta']},
  ],
};
```

FILE: Ytintro.tsx
```tsx
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {ytintroMeta} from './meta';
import type {YtintroProps} from './schema';

loadTemplateFonts();

const W = ytintroMeta.width;
const H = ytintroMeta.height;
const END = ytintroMeta.durationInFrames;
const [S1, S2, S3] = ytintroMeta.scenes;

// Grid: band edges at 120 px, content edges at 200 px.
const BL = 120;
const BR = W - 120;
const X0 = 200;
const X1 = W - 200;

const FLOOD = Easing.bezier(0.5, 0, 0.1, 1);

type Rect = {l: number; t: number; r: number; b: number};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Rect, b: Rect, t: number): Rect => ({
  l: lerp(a.l, b.l, t),
  t: lerp(a.t, b.t, t),
  r: lerp(a.r, b.r, t),
  b: lerp(a.b, b.b, t),
});
const box = (r: Rect): React.CSSProperties => ({
  position: 'absolute',
  left: r.l,
  top: r.t,
  width: Math.max(0, r.r - r.l),
  height: Math.max(0, r.b - r.t),
});
const ramp = (frame: number, a: number, b: number, easing: (t: number) => number = easeOut) =>
  interpolate(frame, [a, b], [0, 1], {...clamp, easing});

export const Ytintro: React.FC<YtintroProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ---------- Layout ----------
  const brandSize = Math.round(fit(texts.brand, 210, X1 - X0 - 40, 0.74));
  const pad = Math.round(brandSize * 0.28 + 24);
  const bandH = brandSize + pad * 2;

  const ctaSize = 36;
  const ctaPad = 30;
  const ctaW = Math.round(texts.cta.length * ctaSize * 0.6 + ctaPad * 2);
  const rowH = 76;
  const headSize = Math.round(fit(texts.headline, 60, X1 - X0 - ctaW - 72, 0.62));

  const gap = 56;
  const groupH = bandH + gap + rowH;
  const bandTop = Math.round((H - groupH) / 2);
  const bandBottom = bandTop + bandH;
  const rowTop = bandBottom + gap;

  const FULL: Rect = {l: 0, t: 0, r: W, b: H};
  const BAR: Rect = {l: BL, t: 956, r: BR, b: 964};
  const BAND: Rect = {l: BL, t: bandTop, r: BR, b: bandBottom};
  const CTA: Rect = {l: X1 - ctaW, t: rowTop, r: X1, b: rowTop + rowH};

  // ---------- The bar: stage -> scrubber -> band -> stage ----------
  let band: Rect;
  if (frame < S1.from + 15) band = mix(FULL, BAR, ramp(frame, S1.from, S1.from + 13, easeInOut));
  else if (frame < S3.from) band = mix(BAR, BAND, ramp(frame, S1.from + 15, S2.from - 1, easeOut));
  else band = mix(BAND, FULL, ramp(frame, S3.from, S3.from + 11, FLOOD));

  // ---------- Playhead knob ----------
  const pop = spring({frame: frame - (S1.from + 15), fps, config: {damping: 30, stiffness: 220}});
  const mid = (X0 + X1) / 2;
  const kx =
    X0 +
    (mid - X0) * ramp(frame, S2.from + 60, S2.from + 70) +
    (X1 - 14 - mid) * ramp(frame, S2.from + 75, S2.from + 85);
  const ky = frame < S3.from ? band.b : bandBottom;
  const k = 28 * pop;
  const knob: Rect = {l: kx - k / 2, r: kx + k / 2, t: ky - k / 2, b: ky + k / 2};
  const morph = ramp(frame, S3.from + 8, S3.from + 20);
  const chip = mix(knob, CTA, morph);

  const trail: Rect = {l: band.l, r: Math.max(band.l, kx), t: band.b - 8, b: band.b};

  // ---------- Camera: locked, then one push per scene, always forward ----------
  const cam =
    frame < S3.from
      ? interpolate(frame, [S2.from, S3.from], [1, 1.03], {...clamp, easing: easeInOut})
      : interpolate(frame, [S3.from, END], [1.03, 1.06], {...clamp, easing: easeOut});

  // ---------- Brand characters ----------
  const brandChars = [...texts.brand];
  const brandStart = S2.from - 1;
  const brandStagger = Math.min(1.4, 14 / Math.max(1, brandChars.length - 1));

  // ---------- Headline chunks, one per beat ----------
  const words = texts.headline.trim().split(/\s+/);
  const per = Math.ceil(words.length / 3);
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += per) groups.push(words.slice(i, i + per).join(' '));
  const headColor = band.b > rowTop + rowH / 2 && band.t < rowTop ? theme.background : theme.foreground;

  // ---------- CTA characters ----------
  const ctaChars = [...texts.cta];
  const ctaStart = S3.from + 14;
  const ctaStagger = Math.min(1, 6 / Math.max(1, ctaChars.length - 1));
  const progress = interpolate(frame, [S3.from + 30, END - 1], [0, 1], {...clamp, easing: Easing.linear});

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: theme.background}}>
      <AbsoluteFill style={{transform: `scale(${cam})`, transformOrigin: '50% 50%'}}>
        {/* The bar / band / flood */}
        <div style={{...box(band), background: theme.accent}} />

        {/* Played trail */}
        {frame >= S1.from + 15 ? <div style={{...box(trail), background: theme.accent2}} /> : null}

        {/* Brand, masked by the band */}
        {frame >= brandStart ? (
          <AbsoluteFill
            style={{clipPath: `inset(${band.t}px ${W - band.r}px ${H - band.b}px ${band.l}px)`}}
          >
            <div
              style={{
                position: 'absolute',
                left: X0,
                top: bandTop + pad,
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: brandSize,
                lineHeight: 1,
                letterSpacing: '-0.01em',
                color: theme.background,
                whiteSpace: 'pre',
              }}
            >
              <span data-text-role="brand">
                {brandChars.map((ch, i) => {
                  const s = brandStart + i * brandStagger;
                  const p = ramp(frame, s, s + 12);
                  return (
                    <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * bandH}px)`}}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            </div>
          </AbsoluteFill>
        ) : null}

        {/* Headline, line-masked chunks */}
        <div
          style={{
            position: 'absolute',
            left: X0,
            top: rowTop + (rowH - headSize * 1.25) / 2,
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: headSize,
            lineHeight: 1.25,
            color: headColor,
            whiteSpace: 'pre',
          }}
        >
          <span data-text-role="headline">
            {groups.map((g, i) => {
              const s = S2.from + 15 + 15 * i;
              const p = ramp(frame, s, s + 12);
              return (
                <React.Fragment key={i}>
                  {i > 0 ? ' ' : ''}
                  <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top'}}>
                    <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`}}>{g}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </span>
        </div>

        {/* Playhead knob, which opens into the CTA block */}
        {pop > 0 ? (
          <div style={{...box(chip), background: theme.accent2, overflow: 'hidden'}}>
            <div
              style={{
                position: 'absolute',
                left: CTA.l + ctaPad - chip.l,
                top: CTA.t - chip.t,
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                fontFamily: MONO_FONT,
                fontWeight: 700,
                fontSize: ctaSize,
                lineHeight: 1,
                color: theme.background,
                whiteSpace: 'pre',
              }}
            >
              <span data-text-role="cta">
                {ctaChars.map((ch, i) => {
                  const s = ctaStart + i * ctaStagger;
                  const p = ramp(frame, s, s + 9);
                  return (
                    <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * rowH}px)`}}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: CTA.l - chip.l,
                top: CTA.b - chip.t - 6,
                height: 6,
                width: ctaW * progress,
                background: `${theme.background}66`,
              }}
            />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```