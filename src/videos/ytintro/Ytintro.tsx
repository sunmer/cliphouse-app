import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeIn, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {ytintroMeta} from './meta';
import type {YtintroProps} from './schema';

loadTemplateFonts();

const W = ytintroMeta.width;
const H = ytintroMeta.height;
const END = ytintroMeta.durationInFrames;
const [S1, S2, S3] = ytintroMeta.scenes;

// Grid: band edges at 120 px, all content on 200 px margins.
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

  // ---------- Timeline (derived from meta) ----------
  const LAND = S1.from + 15;
  const LIFT_END = S2.from - 1;
  const BRAND_IN = S2.from;
  const HEAD_IN = S2.from + 15;
  const SCRUB_A = S2.from + 60;
  const SCRUB_B = S2.from + 75;
  const FLOOD_IN = S3.from;
  const CTA_IN = S3.from + 4;
  const PROG_A = S3.from + 18;
  const PROG_B = END - 10;

  // ---------- Layout ----------
  const brandSize = Math.round(fit(texts.brand, 200, X1 - X0, 0.8));
  const brandLine = Math.round(brandSize * 1.12);
  const pad = Math.round(brandSize * 0.26 + 28);
  const bandH = brandLine + pad * 2;

  const ctaSize = 44;
  const ctaPad = 36;
  const rowH = 96;
  const ctaW = Math.round(texts.cta.length * ctaSize * 0.6 + ctaPad * 2);
  const headSize = Math.round(fit(texts.headline, 64, X1 - X0 - ctaW - 64, 0.6));
  const headLine = Math.round(headSize * 1.25);

  const gap = 56;
  const groupH = bandH + gap + rowH;
  const bandTop = Math.round((H - groupH) / 2);
  const bandBottom = bandTop + bandH;
  const rowTop = bandBottom + gap;

  const FULL: Rect = {l: 0, t: 0, r: W, b: H};
  const BAR: Rect = {l: BL, t: 952, r: BR, b: 962};
  const BAND: Rect = {l: BL, t: bandTop, r: BR, b: bandBottom};
  const CTA: Rect = {l: X1 - ctaW, t: rowTop, r: X1, b: rowTop + rowH};

  // ---------- The bar: stage -> scrubber -> band -> stage ----------
  let band: Rect;
  if (frame < LAND) band = mix(FULL, BAR, ramp(frame, S1.from, LAND - 2, easeInOut));
  else if (frame < FLOOD_IN) band = mix(BAR, BAND, ramp(frame, LAND, LIFT_END, easeOut));
  else band = mix(BAND, FULL, ramp(frame, FLOOD_IN, FLOOD_IN + 11, FLOOD));

  // ---------- Playhead knob ----------
  const pop = spring({frame: frame - LAND, fps, config: {damping: 30, stiffness: 220}});
  const mid = (X0 + X1) / 2;
  const kx = X0 + (mid - X0) * ramp(frame, SCRUB_A, SCRUB_A + 10) + (X1 - mid) * ramp(frame, SCRUB_B, SCRUB_B + 12);
  const ky = frame < FLOOD_IN ? band.b : bandBottom;
  const k = 32 * pop;
  const knob: Rect = {l: kx - k / 2, r: kx + k / 2, t: ky - k / 2, b: ky + k / 2};
  const morph = ramp(frame, FLOOD_IN, FLOOD_IN + 12);
  const opened = mix(knob, CTA, morph);
  const shut = ramp(frame, END - 8, END - 1, easeIn);
  const chip: Rect = {...opened, l: lerp(opened.l, opened.r, shut)};

  // Played trail sits beneath the band, so the flood swallows it.
  const trailY = frame < FLOOD_IN ? band.b : bandBottom;
  const trail: Rect = {l: BL, r: Math.max(BL, kx), t: trailY, b: trailY + 8};

  // ---------- Camera: locked, then one forward push per scene ----------
  const cam =
    frame < FLOOD_IN
      ? interpolate(frame, [S2.from, FLOOD_IN], [1, 1.03], {...clamp, easing: easeInOut})
      : interpolate(frame, [FLOOD_IN, END], [1.03, 1.06], {...clamp, easing: easeOut});

  // ---------- Brand ----------
  const brandChars = [...texts.brand];
  const brandStagger = Math.min(1.4, 14 / Math.max(1, brandChars.length - 1));
  const brandOut = ramp(frame, END - 12, END - 4, easeIn);

  // ---------- Headline chunks, one per beat ----------
  const words = texts.headline.trim().split(/\s+/);
  const per = Math.ceil(words.length / 3);
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += per) groups.push(words.slice(i, i + per).join(' '));
  const headT = frame >= FLOOD_IN ? interpolate(band.b, [rowTop, rowTop + rowH], [0, 1], clamp) : 0;
  const headColor = interpolateColors(headT, [0, 1], [theme.foreground, theme.background]);
  const headOut = ramp(frame, END - 10, END - 3, easeIn);

  // ---------- CTA ----------
  const ctaChars = [...texts.cta];
  const ctaStagger = Math.min(1, 6 / Math.max(1, ctaChars.length - 1));
  const ctaOut = ramp(frame, END - 9, END - 2, easeIn);
  const progress = interpolate(frame, [PROG_A, PROG_B], [0, 1], {...clamp, easing: Easing.linear});

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: theme.background}}>
      <AbsoluteFill style={{transform: `scale(${cam})`, transformOrigin: '50% 50%'}}>
        {/* Played trail (under the band) */}
        {frame >= LAND ? <div style={{...box(trail), background: theme.accent2}} /> : null}

        {/* The bar / band / flood */}
        <div style={{...box(band), background: theme.accent}} />

        {/* Brand, in its own line mask inside the band */}
        {frame >= BRAND_IN ? (
          <div
            style={{
              position: 'absolute',
              left: X0,
              top: bandTop + pad,
              height: brandLine,
              overflow: 'hidden',
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: brandSize,
              lineHeight: `${brandLine}px`,
              letterSpacing: '-0.01em',
              color: theme.background,
              whiteSpace: 'pre',
            }}
          >
            <span data-text-role="brand">
              {brandChars.map((ch, i) => {
                const s = BRAND_IN + i * brandStagger;
                const p = ramp(frame, s, s + 12);
                return (
                  <span
                    key={i}
                    style={{display: 'inline-block', transform: `translateY(${(1 - p) * brandLine * 1.1 - brandOut * brandLine * 1.1}px)`}}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          </div>
        ) : null}

        {/* Headline, line-masked chunks */}
        <div
          style={{
            position: 'absolute',
            left: X0,
            top: rowTop + (rowH - headLine) / 2,
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: headSize,
            lineHeight: `${headLine}px`,
            color: headColor,
            whiteSpace: 'pre',
          }}
        >
          <span data-text-role="headline">
            {groups.map((g, i) => {
              const s = HEAD_IN + 15 * i;
              const p = ramp(frame, s, s + 12);
              return (
                <React.Fragment key={i}>
                  {i > 0 ? ' ' : ''}
                  <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: headLine}}>
                    <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110 - headOut * 110}%)`}}>{g}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </span>
        </div>

        {/* Playhead knob, which opens into the CTA block */}
        {frame >= LAND ? (
          <div style={{...box(chip), background: theme.accent2, overflow: 'hidden'}}>
            <div
              style={{
                position: 'absolute',
                left: CTA.l + ctaPad - chip.l,
                top: CTA.t - chip.t,
                height: rowH,
                fontFamily: MONO_FONT,
                fontWeight: 700,
                fontSize: ctaSize,
                lineHeight: `${rowH}px`,
                color: theme.background,
                whiteSpace: 'pre',
              }}
            >
              <span data-text-role="cta">
                {ctaChars.map((ch, i) => {
                  const s = CTA_IN + i * ctaStagger;
                  const p = ramp(frame, s, s + 8);
                  return (
                    <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * rowH - ctaOut * rowH}px)`}}>
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
                top: CTA.b - chip.t - 8,
                height: 8,
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
