import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, fit} from '../shared/motion';
import {DISPLAY, loadTemplateFonts} from '../shared/fonts';
import {wordmarkMeta} from './meta';
import type {WordmarkProps} from './schema';

loadTemplateFonts();

const W = wordmarkMeta.width;
const H = wordmarkMeta.height;
const M = 160; // grid margin
const LINE_Y = 610; // top edge of the line (baseline of the lockup)
const THICK = 24;
const THIN = 6;
const GAP = 30;
const ROW = 64; // supporting type size
const ROW_H = ROW * 1.3;
const ROW_TOP = LINE_Y + THIN + GAP;
const ROW_C = ROW_TOP + ROW_H / 2;
const SQ = 40;

const [LOCKUP, TAGLINE, END] = wordmarkMeta.scenes;

const T = {
  collapse: [LOCKUP.from, LOCKUP.from + 14] as const,
  rise: LOCKUP.from + 15,
  mass: [LOCKUP.from + 45, LOCKUP.from + LOCKUP.duration] as const,
  words: TAGLINE.from,
  square: TAGLINE.from + 15,
  extend: [TAGLINE.from + 45, TAGLINE.from + 57] as const,
  flood: [END.from, END.from + 11] as const,
  split: [END.from, END.from + 4] as const,
  retract: [END.from + 6, END.from + 18] as const,
  cta: END.from + 10,
};
// Each tick snaps the marker 45 degrees: square -> diamond -> square, one per beat.
const TICKS = [TAGLINE.from + 30, TAGLINE.from + 45, END.from + 15, END.from + 30, END.from + 45];

const expo = Easing.out(Easing.exp);
const ramp = (f: number, a: number, b: number, easing: (t: number) => number = expo) =>
  interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// One accent field drives the whole piece: full frame -> line -> thin line -> full-width line -> full frame.
function fieldRect(f: number) {
  const c = ramp(f, T.collapse[0], T.collapse[1], easeInOut);
  const m = ramp(f, T.mass[0], T.mass[1], easeInOut);
  const e = ramp(f, T.extend[0], T.extend[1], expo);
  const fl = ramp(f, T.flood[0], T.flood[1], easeInOut);
  const thick = lerp(THICK, THIN, m);
  const top = lerp(lerp(0, LINE_Y, c), 0, fl);
  const bottom = lerp(lerp(H, LINE_Y + thick, c), H, fl);
  const left = lerp(lerp(0, M, c), 0, e);
  const right = lerp(lerp(W, W - M, c), W, e);
  return {top, bottom, left, right};
}

const Brand: React.FC<{text: string; size: number; color: string; frame: number; tagged: boolean}> = ({
  text,
  size,
  color,
  frame,
  tagged,
}) => {
  const chars = [...text];
  const stagger = Math.min(2, 16 / Math.max(chars.length - 1, 1));
  const weight = Math.round(lerp(260, 900, ramp(frame, T.mass[0], T.mass[1], easeInOut)));
  const boxH = size * 1.2;
  return (
    <div
      style={{
        position: 'absolute',
        left: M,
        top: LINE_Y - boxH,
        width: W - 2 * M,
        height: boxH,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <span
        data-text-role={tagged ? 'brand' : undefined}
        style={{
          display: 'flex',
          fontFamily: DISPLAY,
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          whiteSpace: 'pre',
          color,
        }}
      >
        {chars.map((ch, i) => {
          const s = T.rise + i * stagger;
          const t = ramp(frame, s, s + 12, expo);
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - t) * 115}%)`}}>
              {ch}
            </span>
          );
        })}
      </span>
    </div>
  );
};

// A row of type that drops out from under the line.
const Row: React.FC<{
  units: string[];
  role: 'headline' | 'cta';
  frame: number;
  start: number;
  spread: number;
  maxStagger: number;
  duration: number;
  size: number;
  weight: number;
  color: string;
  align: 'left' | 'right';
}> = ({units, role, frame, start, spread, maxStagger, duration, size, weight, color, align}) => {
  const stagger = Math.min(maxStagger, spread / Math.max(units.length - 1, 1));
  const rightEdge = W - M - SQ * 2;
  const boxH = GAP + ROW_H;
  return (
    <div
      style={{
        position: 'absolute',
        top: LINE_Y + THIN,
        left: M,
        width: rightEdge - M,
        height: boxH,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        paddingTop: GAP,
        boxSizing: 'border-box',
      }}
    >
      <span
        data-text-role={role}
        style={{
          display: 'flex',
          fontFamily: DISPLAY,
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          whiteSpace: 'pre',
          color,
        }}
      >
        {units.map((u, i) => {
          const s = start + i * stagger;
          const t = ramp(frame, s, s + duration, expo);
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${-(1 - t) * (boxH + 6)}px)`}}>
              {u}
            </span>
          );
        })}
      </span>
    </div>
  );
};

export const Wordmark: React.FC<WordmarkProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const brandSize = fit(texts.brand, 300, W - 2 * M, 0.9);
  const headSize = fit(texts.headline, ROW, 1300, 0.58);
  const ctaSize = fit(texts.cta, ROW, 1200, 0.62);

  const words = texts.headline.trim().split(/\s+/);
  const headUnits = words.map((w, i) => (i < words.length - 1 ? `${w} ` : w));
  const ctaUnits = [...texts.cta];

  const rect = fieldRect(frame);
  const fieldClip = `inset(${rect.top}px ${W - rect.right}px ${H - rect.bottom}px ${rect.left}px)`;
  const flooded = frame >= T.flood[1];

  // Negative line left behind when the field splits open.
  const splitT = ramp(frame, T.split[0], T.split[1], expo);
  const negThick = THIN * splitT;
  const retract = ramp(frame, T.retract[0], T.retract[1], expo);
  const negLeft = lerp(0, M, retract);
  const negRight = lerp(W, W - M, retract);

  // Marker square: drops from the line, then snaps 45 degrees on each beat.
  const drop = spring({frame: frame - T.square, fps, config: {damping: 30, stiffness: 180}});
  const turns = TICKS.reduce((acc, b) => acc + ramp(frame, b, b + 8, expo), 0);
  const sqTop = ROW_C - SQ / 2 - (LINE_Y + THIN);

  // One slow push for the whole piece; never reverses.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.05], {...clamp, easing: Easing.out(Easing.quad)});

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: theme.background}}>
      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: `${W / 2}px ${LINE_Y}px`}}>
        {/* Base layer: foreground on background */}
        <AbsoluteFill>
          <Brand text={texts.brand} size={brandSize} color={theme.foreground} frame={frame} tagged={!flooded} />
          {!flooded && (
            <Row
              units={headUnits}
              role="headline"
              frame={frame}
              start={T.words}
              spread={4}
              maxStagger={3}
              duration={11}
              size={headSize}
              weight={500}
              color={theme.foreground}
              align="left"
            />
          )}
        </AbsoluteFill>

        {/* The accent field: line, then flood. Inside it, the inverted lockup. */}
        <AbsoluteFill style={{background: theme.accent, clipPath: fieldClip}}>
          <Brand text={texts.brand} size={brandSize} color={theme.background} frame={frame} tagged={flooded} />
          <div
            style={{
              position: 'absolute',
              top: LINE_Y + (THIN - negThick) / 2,
              left: negLeft,
              width: negRight - negLeft,
              height: negThick,
              background: theme.background,
            }}
          />
          {frame >= T.cta && (
            <Row
              units={ctaUnits}
              role="cta"
              frame={frame}
              start={T.cta}
              spread={8}
              maxStagger={1.5}
              duration={12}
              size={ctaSize}
              weight={700}
              color={theme.background}
              align="right"
            />
          )}
        </AbsoluteFill>

        {/* Marker square, masked by the line's bottom edge */}
        <div
          style={{
            position: 'absolute',
            top: LINE_Y + THIN,
            left: 0,
            width: W,
            height: H - LINE_Y - THIN,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: W - M - SQ,
              top: sqTop,
              width: SQ,
              height: SQ,
              background: theme.accent2,
              transform: `translateY(${-(1 - drop) * (sqTop + SQ * 1.5 + 6)}px) rotate(${turns * 45}deg)`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
