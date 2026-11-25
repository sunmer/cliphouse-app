import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArrowIcon, Grain, Vignette, clamp, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack} from '../shared/scenes';
import type {SceneProps} from '../shared/scenes';
import type {ThreestepsProps} from './schema';
import {threestepsMeta} from './meta';

loadTemplateFonts();

// Concept: one accent rule measures the journey — it underlines the promise,
// draws the path through each step, then becomes the glow rule under the brand.
// Storyboard:
// 0-85    grid draws on; pill (160,220), headline (160,290), subhead (160,610); carrier = rule under copy (y 790), grows 120 -> 420.
// 85-100  rule glides up to node 1 (420,330) and collapses into a dot.
// 100-200 rule draws 1 -> 2 -> 3 across nodes at x 420/960/1500; each card lights on arrival (108/140/180).
// 220-282 path contracts into centered glow rule (760-1160, y 520); brand above, CTA pops below and holds.
// 282-300 rule glides back to its first-frame state under the opener position, closing the loop.

type SP = SceneProps<ThreestepsProps>;
type Theme = ThreestepsProps['theme'];

const a = (hex: string, alpha: number) =>
  hex + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');

const CENTERS = [420, 960, 1500];
const ARRIVALS = [108, 140, 180];
const LINE_Y = 330;

const KEYS = [0, 30, 85, 100, 110, 140, 150, 180, 220, 240, 282, 300];
const XS = [160, 160, 160, 420, 420, 420, 420, 420, 420, 760, 760, 160];
const YS = [790, 790, 790, LINE_Y, LINE_Y, LINE_Y, LINE_Y, LINE_Y, LINE_Y, 520, 520, 790];
const WS = [120, 420, 420, 2, 2, 540, 540, 1080, 1080, 400, 400, 120];

const GridLines: React.FC<{theme: Theme}> = ({theme}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 24], [0, 1], {...clamp, easing: easeOut});
  const drift = Math.sin(frame / 40) * 6;
  const stroke = a(theme.foreground, 0.06);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{transform: `translateX(${drift}px)`}}>
        {Array.from({length: 12}, (_, i) => (
          <line key={`v${i}`} x1={160 * i} x2={160 * i} y1={0} y2={1080 * draw} stroke={stroke} strokeWidth={1} />
        ))}
        {Array.from({length: 9}, (_, i) => (
          <line key={`h${i}`} y1={120 * i} y2={120 * i} x1={0} x2={1920 * draw} stroke={stroke} strokeWidth={1} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// The carrier: a single SVG rule that never leaves the frame.
const Carrier: React.FC<{theme: Theme}> = ({theme}) => {
  const frame = useCurrentFrame();
  const opt = {...clamp, easing: easeInOut};
  const x = interpolate(frame, KEYS, XS, opt);
  const y = interpolate(frame, KEYS, YS, opt);
  const w = interpolate(frame, KEYS, WS, opt);
  const track = interpolate(frame, [90, 105, 212, 228], [0, 1, 1, 0], clamp);
  const pulse = interpolate(frame, [98, 104, 200, 214], [0, 1, 1, 0], clamp);
  const glow = interpolate(frame, [220, 245], [0, 1], clamp) * interpolate(frame, [282, 300], [1, 0], clamp);
  const breathe = 0.7 + 0.3 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{overflow: 'visible'}}>
        <line x1={420} x2={1500} y1={LINE_Y} y2={LINE_Y} stroke={a(theme.foreground, 0.16 * track)} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
        <line
          x1={x}
          x2={x + w}
          y1={y}
          y2={y}
          stroke={theme.accent}
          strokeWidth={6}
          strokeLinecap="round"
          style={{filter: `drop-shadow(0 0 ${8 + 22 * glow * breathe}px ${a(theme.accent, 0.4 + 0.5 * glow)})`}}
        />
        <circle cx={x + w} cy={y} r={9 + 3 * Math.sin(frame / 3)} fill={theme.accent} opacity={pulse} />
        <circle cx={x + w} cy={y} r={20} fill="none" stroke={a(theme.accent, 0.5)} strokeWidth={2} opacity={pulse * breathe} />
      </svg>
    </AbsoluteFill>
  );
};

const Opener: React.FC<SP> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pill = spring({frame, fps, config: {damping: 16, stiffness: 140}});
  const head = spring({frame: frame - 8, fps, config: {damping: 18, stiffness: 110}});
  const sub = interpolate(frame, [20, 36], [0, 1], {...clamp, easing: easeOut});
  const hSize = wrapFit(texts.headline, 140, 1500, 2, 0.56, 64);
  const sSize = wrapFit(texts.subhead, 44, 1300, 2, 0.52, 28);
  return (
    <AbsoluteFill>
      <div
        data-text-role="brand"
        style={{
          position: 'absolute', left: 160, top: 210, padding: '12px 26px', borderRadius: 999,
          border: `2px solid ${a(theme.accent, 0.6)}`, background: theme.surface, color: theme.foreground,
          fontFamily: MONO_FONT, fontSize: fit(texts.brand, 28, 360), letterSpacing: 4, fontWeight: 600,
          opacity: pill, transform: `translateY(${(1 - pill) * 24}px)`,
        }}
      >
        {texts.brand}
      </div>
      <div style={{position: 'absolute', left: 160, top: 290, width: 1500, overflow: 'hidden', paddingBottom: 8}}>
        <div
          data-text-role="headline"
          style={{
            fontFamily: DISPLAY, fontSize: hSize, fontWeight: 800, lineHeight: 1.0, letterSpacing: -hSize * 0.035,
            color: theme.foreground, transform: `translateY(${(1 - head) * 110}%)`,
          }}
        >
          {texts.headline}
        </div>
      </div>
      <div
        data-text-role="subhead"
        style={{
          position: 'absolute', left: 160, top: 610, width: 1300, fontFamily: SANS_FONT, fontSize: sSize,
          lineHeight: 1.25, color: a(theme.foreground, 0.72), opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        {texts.subhead}
      </div>
    </AbsoluteFill>
  );
};

const STEP_ROLES = ['point1', 'point2', 'point3'] as const;

const Steps: React.FC<SP> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = frame + threestepsMeta.scenes[1].from;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
        {CENTERS.map((cx, i) => {
          const h = interpolate(g, [ARRIVALS[i], ARRIVALS[i] + 8], [0, 1], clamp);
          const ring = interpolate(g, [ARRIVALS[i], ARRIVALS[i] + 22], [0, 1], {...clamp, easing: easeOut});
          const inS = spring({frame: frame - 14 - i * 5, fps, config: {damping: 14, stiffness: 160}});
          return (
            <g key={cx}>
              <line x1={cx} x2={cx} y1={LINE_Y + 16} y2={LINE_Y + 16 + 54 * inS} stroke={h > 0 ? theme.accent : a(theme.foreground, 0.2)} strokeWidth={3} />
              <circle cx={cx} cy={LINE_Y} r={16 * inS} fill={h > 0.5 ? theme.accent : theme.surface} stroke={h > 0 ? theme.accent : a(theme.foreground, 0.35)} strokeWidth={3} />
              {ring > 0 && ring < 1 ? (
                <circle cx={cx} cy={LINE_Y} r={16 + 60 * ring} fill="none" stroke={theme.accent2} strokeWidth={3} opacity={1 - ring} />
              ) : null}
            </g>
          );
        })}
      </svg>
      {STEP_ROLES.map((role, i) => {
        const enter = spring({frame: frame - 4 - i * 6, fps, config: {damping: 17, stiffness: 120}});
        const h = interpolate(g, [ARRIVALS[i], ARRIVALS[i] + 10], [0, 1], {...clamp, easing: easeOut});
        return (
          <div
            key={role}
            style={{
              position: 'absolute', left: CENTERS[i] - 230, top: 400, width: 460, height: 300, borderRadius: 28,
              background: theme.surface, border: `2px solid ${h > 0 ? a(theme.accent, 0.3 + 0.6 * h) : a(theme.foreground, 0.1)}`,
              boxShadow: `0 ${20 + 20 * h}px 70px ${a(theme.accent, 0.22 * h)}`, padding: 44, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              opacity: Math.min(1, enter * 1.4), transform: `translateY(${(1 - enter) * 80 - 14 * h}px)`,
            }}
          >
            <div style={{fontFamily: MONO_FONT, fontSize: 30, letterSpacing: 4, color: h > 0 ? theme.accent : a(theme.foreground, 0.4)}}>
              {`0${i + 1}`}
            </div>
            <div style={{height: 4, width: 60 + 120 * h, background: h > 0 ? theme.accent2 : a(theme.foreground, 0.15), borderRadius: 2}} />
            <div
              data-text-role={role}
              style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: fit(texts[role], 52, 372, 0.58), color: theme.foreground, lineHeight: 1.1, whiteSpace: 'nowrap'}}
            >
              {texts[role]}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Closing: React.FC<SP> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brand = spring({frame: frame - 6, fps, config: {damping: 18, stiffness: 120}});
  const btn = spring({frame: frame - 18, fps, config: {damping: 12, stiffness: 150, mass: 0.8}});
  const breathe = 0.5 + 0.5 * Math.sin(frame / 8);
  const ctaSize = fit(texts.cta, 52, 600, 0.6);
  return (
    <AbsoluteFill style={{alignItems: 'center'}}>
      <div style={{position: 'absolute', top: 330, width: 1600, overflow: 'hidden', display: 'flex', justifyContent: 'center', paddingBottom: 10}}>
        <div
          data-text-role="brand"
          style={{
            fontFamily: DISPLAY, fontWeight: 800, fontSize: fit(texts.brand, 130, 1400, 0.66), letterSpacing: -2,
            color: theme.foreground, lineHeight: 1.05, transform: `translateY(${(1 - brand) * 110}%)`,
          }}
        >
          {texts.brand}
        </div>
      </div>
      <div
        data-text-role="cta"
        style={{
          position: 'absolute', top: 590, display: 'flex', alignItems: 'center', gap: 20, padding: '30px 56px',
          borderRadius: 999, background: theme.accent, color: theme.background, fontFamily: SANS_FONT, fontWeight: 800,
          fontSize: ctaSize, whiteSpace: 'nowrap', opacity: Math.min(1, btn * 1.5),
          transform: `scale(${0.6 + 0.4 * btn})`,
          boxShadow: `0 0 ${40 + 30 * breathe}px ${a(theme.accent, 0.35 + 0.15 * breathe)}`,
        }}
      >
        {texts.cta}
        <ArrowIcon size={ctaSize * 0.9} />
      </div>
    </AbsoluteFill>
  );
};

export const Threesteps: React.FC<ThreestepsProps> = (props) => {
  const {theme} = props;
  return (
    <AbsoluteFill style={{background: theme.background, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, ${a(theme.accent2, 0.08)}, transparent 60%)`}} />
      <GridLines theme={theme} />
      <Carrier theme={theme} />
      <SceneTrack<ThreestepsProps> meta={threestepsMeta} scenes={[Opener, Steps, Closing]} props={props} exit="fade" />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
