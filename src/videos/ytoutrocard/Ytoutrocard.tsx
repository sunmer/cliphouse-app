import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Vignette, clamp, easeIn, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {ytoutrocardMeta} from './meta';
import type {YtoutrocardProps} from './schema';

loadTemplateFonts();

// Storyboard (120 BPM, 15 frames per beat)
// 0-18   carrier: small accent pill at bottom center (x50%, y85%) shoots up to the top band, stretching into an underline (y21%)
// 4-20   brand kicker masks up at top (y5%); 12-36 headline words rise out of the underline (y9-19%)
// 18-58  underline slowly grows; 58-72 it extends into a full-width rail (y24%) while the kicker exits
// 62-102 two 16:9 frames unfold down from the rail (x11-48%, x52-89%, y25-61%); labels mask in by 110
// 74-102 rail pinches to a sliver and drops through the 80px gap between frames
// 102-118 sliver expands into the subscribe pill (x50%, y85%); 114-136 cta + brand mask in
// 110-360 frames are frozen; ambient rings pulse around the pill every beat pair

const FRAME_W = 700;
const FRAME_H = 394;
const FRAME_Y = 270;
const FRAME_XS = [220, 1000];
const PILL = {cx: 960, cy: 915, w: 460, h: 110};
const UNDER_Y = 232;
const RAIL_Y = 260;

const e = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: easeOut});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type SceneComp = React.FC<{props: YtoutrocardProps; from: number}>;

const Mask: React.FC<{p: number; out?: number; role: string; style: React.CSSProperties; children: React.ReactNode}> = ({
  p,
  out = 0,
  role,
  style,
  children,
}) => (
  <div style={{overflow: 'hidden', display: 'inline-block', paddingBottom: '0.08em'}}>
    <div
      data-text-role={role}
      style={{...style, display: 'block', whiteSpace: 'nowrap', transform: `translateY(${(1 - p) * 112 - out * 112}%)`}}
    >
      {children}
    </div>
  </div>
);

const Backdrop: React.FC<{theme: YtoutrocardProps['theme']}> = ({theme}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${theme.accent2}1c 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 50% 100%, ${theme.accent}14 0%, transparent 70%), ${theme.background}`,
    }}
  />
);

const Carrier: React.FC<{theme: YtoutrocardProps['theme']}> = ({theme}) => {
  const f = useCurrentFrame();
  const t1 = interpolate(f, [3, 18], [0, 1], {...clamp, easing: easeInOut});
  const t2 = interpolate(f, [18, 58], [0, 1], clamp);
  const t3 = e(f, 58, 72);
  const t4 = e(f, 74, 88);
  const t5 = interpolate(f, [88, 102], [0, 1], {...clamp, easing: easeInOut});
  const t6 = e(f, 102, 118);

  let w = lerp(120, 520, t1);
  w = lerp(w, 600, t2);
  w = lerp(w, 1480, t3);
  w = lerp(w, 40, t4);
  w = lerp(w, PILL.w, t6);

  let cy = lerp(PILL.cy, UNDER_Y, t1);
  cy = lerp(cy, RAIL_Y, t3);
  cy = lerp(cy, PILL.cy, t5);

  let h = lerp(14, 8, t1);
  h = lerp(h, 6, t3);
  h = lerp(h, 14, t4);
  h += Math.sin(Math.PI * t5) * 70;
  h = lerp(h, PILL.h, t6);

  return (
    <div
      style={{
        position: 'absolute',
        left: PILL.cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        borderRadius: h / 2,
        background: theme.accent,
        boxShadow: `0 0 ${12 + t6 * 50}px ${theme.accent}${t6 > 0.5 ? '66' : '40'}`,
      }}
    />
  );
};

const Headline: React.FC<{text: string; color: string}> = ({text, color}) => {
  const f = useCurrentFrame();
  const words = text.trim().split(/\s+/);
  const size = fit(text, 100, 1560, 0.56);
  const stagger = words.length > 1 ? Math.min(5, 10 / (words.length - 1)) : 0;
  return (
    <div style={{position: 'absolute', left: 0, top: UNDER_Y - 20 - size * 1.12, width: 1920, display: 'flex', justifyContent: 'center'}}>
      <div data-text-role="headline" style={{display: 'flex', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.08, color, letterSpacing: '-0.02em'}}>
        {words.map((word, i) => {
          const start = 12 + i * stagger;
          const p = e(f, start, start + 14);
          return (
            <span key={i} style={{display: 'inline-block', overflow: 'hidden', marginRight: i < words.length - 1 ? '0.26em' : 0, paddingBottom: '0.06em'}}>
              <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`}}>{word}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

const TopScene: SceneComp = ({props, from}) => {
  const f = useCurrentFrame() + from;
  const {texts, theme} = props;
  const pin = e(f, 4, 20);
  const pout = interpolate(f, [60, 74], [0, 1], {...clamp, easing: easeIn});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 40, left: 0, width: 1920, display: 'flex', justifyContent: 'center'}}>
        <Mask
          p={pin}
          out={pout}
          role="brand"
          style={{fontFamily: MONO_FONT, fontSize: fit(texts.brand, 28, 900, 0.92), letterSpacing: '0.32em', color: theme.accent2, fontWeight: 600, lineHeight: 1.2}}
        >
          {texts.brand}
        </Mask>
      </div>
    </AbsoluteFill>
  );
};

const VideoFrame: React.FC<{x: number; index: number; f: number; theme: YtoutrocardProps['theme']; label: string; role: string}> = ({
  x,
  index,
  f,
  theme,
  label,
  role,
}) => {
  const reveal = e(f, 62 + index * 6, 96 + index * 6);
  const lp = e(f, 90 + index * 6, 104 + index * 6);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: FRAME_Y,
          width: FRAME_W,
          height: FRAME_H,
          clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0 round 24px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24,
            background: `linear-gradient(160deg, ${theme.surface} 0%, ${theme.background} 140%)`,
            border: `2px solid ${theme.foreground}1f`,
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: FRAME_W / 2 - 55,
            top: FRAME_H / 2 - 55,
            width: 110,
            height: 110,
            borderRadius: 55,
            border: `3px solid ${theme.accent2}`,
            background: `${theme.background}99`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 42,
              top: 32,
              width: 0,
              height: 0,
              borderTop: '20px solid transparent',
              borderBottom: '20px solid transparent',
              borderLeft: `32px solid ${theme.foreground}`,
            }}
          />
        </div>
        <div style={{position: 'absolute', left: 28, right: 28, bottom: 26, height: 6, borderRadius: 3, background: `${theme.foreground}1f`}}>
          <div style={{width: index === 0 ? '38%' : '64%', height: '100%', borderRadius: 3, background: theme.accent2}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: x, top: FRAME_Y + FRAME_H + 20, display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 6, height: 34 * lp, borderRadius: 3, background: theme.accent2}} />
        <Mask p={lp} role={role} style={{fontFamily: SANS_FONT, fontWeight: 700, fontSize: fit(label, 40, 620, 0.58), lineHeight: 1.15, color: theme.foreground}}>
          {label}
        </Mask>
      </div>
    </>
  );
};

const FramesScene: SceneComp = ({props, from}) => {
  const f = useCurrentFrame() + from;
  const {texts, theme} = props;
  const ringsIn = e(f, 118, 140);
  return (
    <AbsoluteFill>
      <VideoFrame x={FRAME_XS[0]} index={0} f={f} theme={theme} label={texts.point1} role="point1" />
      <VideoFrame x={FRAME_XS[1]} index={1} f={f} theme={theme} label={texts.point2} role="point2" />
      {[0, 1].map((k) => {
        const local = f - 120 - k * 30;
        if (local < 0) return null;
        const phase = (local % 60) / 60;
        const spread = easeOut(phase) * 28;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: PILL.cx - PILL.w / 2 - spread,
              top: PILL.cy - PILL.h / 2 - spread,
              width: PILL.w + spread * 2,
              height: PILL.h + spread * 2,
              borderRadius: PILL.h / 2 + spread,
              border: `2px solid ${theme.accent2}`,
              boxSizing: 'border-box',
              opacity: (1 - phase) * 0.45 * ringsIn,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LockupScene: SceneComp = ({props, from}) => {
  const f = useCurrentFrame() + from;
  const {texts, theme} = props;
  const ctaP = e(f, 114, 130);
  const brandP = e(f, 120, 136);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 768, left: 0, width: 1920, display: 'flex', justifyContent: 'center'}}>
        <Mask
          p={brandP}
          role="brand"
          style={{fontFamily: SANS_FONT, fontWeight: 700, fontSize: fit(texts.brand, 38, 760, 0.76), letterSpacing: '0.14em', lineHeight: 1.2, color: theme.foreground}}
        >
          {texts.brand}
        </Mask>
      </div>
      <div
        style={{
          position: 'absolute',
          left: PILL.cx - PILL.w / 2,
          top: PILL.cy - PILL.h / 2,
          width: PILL.w,
          height: PILL.h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mask p={ctaP} role="cta" style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: fit(texts.cta, 46, 400, 0.6), lineHeight: 1.15, color: theme.background}}>
          {texts.cta}
        </Mask>
      </div>
    </AbsoluteFill>
  );
};

const SCENES: SceneComp[] = [TopScene, FramesScene, LockupScene];

export const Ytoutrocard: React.FC<YtoutrocardProps> = (props) => {
  const {texts, theme} = props;
  return (
    <AbsoluteFill style={{backgroundColor: theme.background, overflow: 'hidden'}}>
      <Backdrop theme={theme} />
      <Vignette />
      <Carrier theme={theme} />
      <Headline text={texts.headline} color={theme.foreground} />
      {ytoutrocardMeta.scenes.map((s, i) => {
        const Scene = SCENES[i];
        return (
          <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
            <Scene props={props} from={s.from} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
