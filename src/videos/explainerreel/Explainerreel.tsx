import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArrowIcon, clamp, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack} from '../shared/scenes';
import type {SceneProps} from '../shared/scenes';
import type {ExplainerreelProps} from './schema';
import {explainerreelMeta} from './meta';

loadTemplateFonts();

type P = SceneProps<ExplainerreelProps>;

// Layout constants (px, 1080x1920 frame)
const PAD = 90;
const SPINE_X = 146;
const SPINE_TOP = 560;
const SPINE_H = 960;
const CARD_CENTERS = [700, 1040, 1380];
const CARD_H = 240;
const NODE_LIT = [35, 75, 115]; // local frames in scene 2 (global 110, 150, 190)
const CTA_Y = 1200;
const CTA_H = 180;

// Carrier keyframes: underline -> spine -> CTA pill -> underline (loop)
const KF = [0, 20, 70, 95, 205, 235, 284, 300];
const k = (f: number, v: number[]) => interpolate(f, KF, v, {...clamp, easing: easeInOut});

const Carrier: React.FC<{theme: ExplainerreelProps['theme']}> = ({theme}) => {
  const f = useCurrentFrame();
  const x = k(f, [PAD, PAD, PAD, SPINE_X, SPINE_X, PAD, PAD, PAD]);
  const y = k(f, [1120, 1120, 1120, SPINE_TOP, SPINE_TOP, CTA_Y, CTA_Y, 1120]);
  const w = k(f, [0, 260, 260, 8, 8, 900, 900, 0]);
  const h = k(f, [14, 14, 14, SPINE_H, SPINE_H, CTA_H, CTA_H, 14]);
  const fill = interpolate(
    f,
    [70, 95, 110, 130, 150, 170, 190, 210],
    [1, 0, 0.146, 0.146, 0.5, 0.5, 0.854, 1],
    {...clamp, easing: easeInOut},
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 999,
        overflow: 'hidden',
        background: theme.surface,
        boxShadow: `0 0 ${f > 220 ? 60 : 24}px ${theme.accent}55`,
      }}
    >
      <div style={{width: '100%', height: `${fill * 100}%`, background: theme.accent, borderRadius: 999}} />
    </div>
  );
};

const Mask: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay, children, style}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [delay, delay + 22], [0, 1], {...clamp, easing: easeOut});
  return (
    <div style={{overflow: 'hidden', ...style}}>
      <div style={{transform: `translateY(${(1 - t) * 110}%)`}}>{children}</div>
    </div>
  );
};

const Intro: React.FC<P> = ({texts, theme}) => {
  const f = useCurrentFrame();
  const pill = interpolate(f, [0, 18], [0, 1], {...clamp, easing: easeOut});
  const hSize = wrapFit(texts.headline, 150, 900, 2, 0.58, 60);
  const sSize = wrapFit(texts.subhead, 54, 900, 3, 0.52, 30);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 170, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div
          data-text-role="brand"
          style={{
            transform: `translateY(${(1 - pill) * -60}px) scale(${0.9 + pill * 0.1})`,
            padding: '18px 40px',
            borderRadius: 999,
            background: theme.surface,
            border: `2px solid ${theme.accent2}`,
            color: theme.foreground,
            fontFamily: MONO_FONT,
            fontSize: fit(texts.brand, 40, 560),
            letterSpacing: 4,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {texts.brand}
        </div>
      </div>
      <div style={{position: 'absolute', left: PAD, width: 900, top: 680, height: 410, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'}}>
        <Mask delay={6}>
          <div data-text-role="headline" style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: hSize, lineHeight: 1.02, color: theme.foreground, letterSpacing: -2}}>
            {texts.headline}
          </div>
        </Mask>
      </div>
      <Mask delay={16} style={{position: 'absolute', left: PAD, width: 900, top: 1170}}>
        <div data-text-role="subhead" style={{fontFamily: SANS_FONT, fontSize: sSize, lineHeight: 1.3, color: theme.foreground, opacity: 0.78}}>
          {texts.subhead}
        </div>
      </Mask>
    </AbsoluteFill>
  );
};

const Steps: React.FC<P> = ({texts, theme}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const points = [texts.point1, texts.point2, texts.point3];
  const roles = ['point1', 'point2', 'point3'] as const;
  return (
    <AbsoluteFill>
      {points.map((text, i) => {
        const cy = CARD_CENTERS[i];
        const enter = interpolate(f, [10 + i * 12, 34 + i * 12], [0, 1], {...clamp, easing: easeOut});
        const lit = spring({frame: f - NODE_LIT[i], fps, config: {damping: 14, stiffness: 160}});
        const ring = interpolate(f, [NODE_LIT[i], NODE_LIT[i] + 24], [0, 1], clamp);
        const active = f >= NODE_LIT[i];
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: SPINE_X + 4 - 60,
                top: cy - 60,
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `3px solid ${theme.accent}`,
                opacity: active ? (1 - ring) * 0.8 : 0,
                transform: `scale(${0.4 + ring * 0.9})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: SPINE_X + 4 - 24,
                top: cy - 24,
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: active ? theme.accent : theme.background,
                border: `4px solid ${active ? theme.accent : theme.accent2}`,
                transform: `scale(${enter * (1 + lit * 0.2 - Math.max(0, lit - 1) * 0.2)})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 230,
                top: cy - CARD_H / 2,
                width: 760,
                height: CARD_H,
                borderRadius: 36,
                background: theme.surface,
                border: `3px solid ${active ? theme.accent : `${theme.foreground}18`}`,
                boxShadow: active ? `0 20px 60px ${theme.accent}${Math.round(lit * 40).toString(16).padStart(2, '0')}` : 'none',
                transform: `translateX(${(1 - enter) * 300}px) scale(${1 + lit * 0.03 - Math.min(lit, 1) * 0.03 + 0.03 * (active ? 1 : 0)})`,
                opacity: enter,
                display: 'flex',
                alignItems: 'center',
                padding: '0 30px',
                gap: 20,
              }}
            >
              <div style={{width: 120, fontFamily: MONO_FONT, fontSize: 56, fontWeight: 700, color: active ? theme.accent : theme.accent2}}>
                {`0${i + 1}`}
              </div>
              <div
                data-text-role={roles[i]}
                style={{fontFamily: DISPLAY, fontWeight: 750, fontSize: fit(text, 84, 560), color: theme.foreground, whiteSpace: 'nowrap'}}
              >
                {text}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const Outro: React.FC<P> = ({texts, theme}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brandIn = spring({frame: f - 4, fps, config: {damping: 16, stiffness: 120}});
  const ctaIn = spring({frame: f - 12, fps, config: {damping: 12, stiffness: 150}});
  const out = interpolate(f, [58, 66], [1, 0], clamp);
  const nudge = Math.sin(f / 5) * 10;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: 720, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28}}>
        <div style={{width: 90, height: 90, borderRadius: 28, background: theme.accent2, transform: `rotate(${(1 - brandIn) * -90}deg) scale(${brandIn})`}} />
        <div
          data-text-role="brand"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: fit(texts.brand, 130, 900),
            color: theme.foreground,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            transform: `translateY(${(1 - brandIn) * 60}px)`,
          }}
        >
          {texts.brand}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: PAD,
          top: CTA_Y,
          width: 900,
          height: CTA_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          color: theme.background,
          transform: `scale(${0.85 + Math.min(ctaIn, 1.2) * 0.15})`,
        }}
      >
        <div data-text-role="cta" style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: fit(texts.cta, 76, 640), whiteSpace: 'nowrap'}}>
          {texts.cta}
        </div>
        <div style={{display: 'flex', transform: `translateX(${nudge}px)`}}>
          <ArrowIcon size={64} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Explainerreel: React.FC<ExplainerreelProps> = (props) => {
  const f = useCurrentFrame();
  const {theme} = props;
  const gx = 50 + Math.sin(f / 40) * 20;
  const gy = 40 + Math.cos(f / 50) * 15;
  return (
    <AbsoluteFill style={{background: theme.background, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at ${gx}% ${gy}%, ${theme.accent2}33 0%, transparent 55%)`}} />
      <Carrier theme={theme} />
      <SceneTrack meta={explainerreelMeta} scenes={[Intro, Steps, Outro]} props={props} />
    </AbsoluteFill>
  );
};
