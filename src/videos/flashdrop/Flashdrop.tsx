import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  interpolateColors,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {clamp, easeInOut, easeOut, fit, wrapFit, Vignette} from '../shared/motion';
import {loadTemplateFonts, DISPLAY, SANS_FONT} from '../shared/fonts';
import type {FlashdropProps} from './schema';
import {flashdropMeta} from './meta';

loadTemplateFonts();

type SP = {p: FlashdropProps; d: number};

const pop = (frame: number, fps: number, delay: number) =>
  spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 170, mass: 0.8}});

const row = (top: number): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  right: 0,
  top,
  display: 'flex',
  justifyContent: 'center',
});

// Carrier keyframes: slash -> stamp -> button -> slash
const K = [0, 70, 86, 165, 182, 226, 240];
const CY = [1240, 1240, 800, 800, 1380, 1380, 1240];
const CW = [1500, 1500, 860, 860, 760, 760, 1500];
const CH = [44, 44, 340, 340, 160, 160, 44];
const CR = [0, 0, 40, 40, 80, 80, 0];
const CROT = [-12, -12, -5, -5, 0, 0, -12];

const Carrier: React.FC<{p: FlashdropProps}> = ({p}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = (v: number[]) => interpolate(f, K, v, {...clamp, easing: easeInOut});
  const stampHit = f >= 86 && f < 165 ? pop(f, fps, 86) : 1;
  const wobble = f >= 86 && f < 165 ? Math.sin((f - 86) / 7.5) * 0.8 : 0;
  const beat = f >= 190 && f < 222 ? Math.max(0, Math.cos(((f - 190) / 15) * Math.PI * 2)) ** 6 * 0.04 : 0;
  const drift = f < 70 ? Math.sin(f / 9) * 8 : 0;
  const scale = interpolate(stampHit, [0, 1], [1.25, 1]) + beat;
  const color = interpolateColors(f, [0, 165, 182, 226, 240], [p.theme.accent, p.theme.accent, p.theme.accent2, p.theme.accent2, p.theme.accent]);
  const w = k(CW);
  const h = k(CH);
  const ring = interpolate(f, [182, 204], [0, 1], clamp);
  const base: React.CSSProperties = {
    position: 'absolute',
    left: 540 - w / 2,
    top: k(CY) - h / 2 + drift,
    width: w,
    height: h,
    borderRadius: k(CR),
  };
  return (
    <AbsoluteFill>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            ...base,
            border: `6px solid ${p.theme.accent2}`,
            opacity: 1 - ring,
            transform: `scale(${1 + ring * 0.6})`,
          }}
        />
      )}
      <div
        style={{
          ...base,
          background: color,
          transform: `rotate(${k(CROT) + wobble}deg) scale(${scale})`,
          boxShadow: `0 30px 80px ${p.theme.background}`,
        }}
      />
    </AbsoluteFill>
  );
};

const LINES = Array.from({length: 14}, (_, i) => ({
  y: random(`y${i}`) * 2700,
  len: 200 + random(`l${i}`) * 520,
  sp: 40 + random(`s${i}`) * 55,
  off: random(`o${i}`) * 2800,
  thick: 4 + random(`t${i}`) * 10,
  alt: i % 3 === 0,
}));

const SpeedLines: React.FC<{p: FlashdropProps}> = ({p}) => {
  const f = useCurrentFrame();
  const o = Math.max(
    interpolate(f, [0, 6, 62, 76], [0, 1, 1, 0], clamp),
    interpolate(f, [165, 172, 196, 212], [0, 1, 1, 0], clamp),
  );
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{inset: -400, transform: 'rotate(-12deg)', opacity: o}}>
      {LINES.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: l.y,
            left: ((f * l.sp + l.off) % 2800) - 800,
            width: l.len,
            height: l.thick,
            borderRadius: l.thick,
            background: l.alt ? p.theme.accent2 : p.theme.foreground,
            opacity: l.alt ? 0.8 : 0.35,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const BrandPill: React.FC<{p: FlashdropProps; s: number}> = ({p, s}) => (
  <div
    data-text-role="brand"
    style={{
      padding: '18px 44px',
      borderRadius: 999,
      border: `3px solid ${p.theme.accent}`,
      background: p.theme.surface,
      color: p.theme.foreground,
      fontFamily: SANS_FONT,
      fontWeight: 800,
      letterSpacing: '0.18em',
      fontSize: fit(p.texts.brand, 44, 600, 0.78),
      transform: `translateY(${(1 - s) * -90}px)`,
      opacity: Math.min(1, s * 2),
      whiteSpace: 'nowrap',
    }}
  >
    {p.texts.brand}
  </div>
);

const Headline: React.FC<{p: FlashdropProps; f: number; delay: number; max: number}> = ({p, f, delay, max}) => {
  const {fps} = useVideoConfig();
  const size = wrapFit(p.texts.headline, max, 920, 3, 0.6, 60);
  return (
    <div
      data-text-role="headline"
      style={{
        width: 920,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * 0.25,
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.02,
        textTransform: 'uppercase',
        color: p.theme.foreground,
        textAlign: 'center',
      }}
    >
      {p.texts.headline.split(/\s+/).map((w, i) => {
        const s = pop(f, fps, delay + Math.min(i, 6) * 3);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${interpolate(s, [0, 1], [2.4, 1])}) rotate(${interpolate(s, [0, 1], [-8, 0])}deg)`,
              opacity: Math.min(1, Math.max(0, s * 1.6)),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const TitleScene: React.FC<SP> = ({p, d}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [d - 10, d], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={row(540)}>
        <BrandPill p={p} s={pop(f, fps, 4)} />
      </div>
      <div style={row(700)}>
        <Headline p={p} f={f} delay={10} max={160} />
      </div>
    </AbsoluteFill>
  );
};

const PriceScene: React.FC<SP> = ({p, d}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [d - 10, d], [1, 0], clamp);
  const ps = spring({frame: f - 12, fps, config: {damping: 12, stiffness: 220, mass: 0.7}});
  const ns = pop(f, fps, 22);
  const points = [p.texts.point1, p.texts.point2, p.texts.point3];
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{...row(800 - 130), height: 260, alignItems: 'center'}}>
        <div
          data-text-role="price"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: fit(p.texts.price, 230, 760, 0.62),
            lineHeight: 1,
            color: p.theme.background,
            whiteSpace: 'nowrap',
            transform: `rotate(-5deg) scale(${interpolate(ps, [0, 1], [2.2, 1])})`,
            opacity: interpolate(f, [12, 16], [0, 1], clamp),
          }}
        >
          {p.texts.price}
        </div>
      </div>
      <div style={row(1010)}>
        <div
          data-text-role="priceNote"
          style={{
            padding: '16px 36px',
            borderRadius: 999,
            background: p.theme.accent2,
            color: p.theme.background,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: fit(p.texts.priceNote, 46, 720, 0.58),
            whiteSpace: 'nowrap',
            transform: `scale(${interpolate(ns, [0, 1], [0.4, 1])})`,
            opacity: Math.min(1, ns * 2),
          }}
        >
          {p.texts.priceNote}
        </div>
      </div>
      {points.map((t, i) => {
        const dl = 30 + i * 6;
        const x = interpolate(f, [dl, dl + 12], [640, 0], {...clamp, easing: easeOut});
        return (
          <div key={i} style={row(1170 + i * 130)}>
            <div
              style={{
                width: 760,
                height: 104,
                borderRadius: 28,
                background: p.theme.surface,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '0 36px',
                boxSizing: 'border-box',
                transform: `translateX(${x}px)`,
                opacity: interpolate(f, [dl, dl + 6], [0, 1], clamp),
              }}
            >
              <div style={{width: 22, height: 22, borderRadius: 6, background: p.theme.accent, transform: 'rotate(45deg)'}} />
              <div
                data-text-role={`point${i + 1}`}
                style={{
                  fontFamily: SANS_FONT,
                  fontWeight: 700,
                  fontSize: fit(t, 56, 600, 0.58),
                  color: p.theme.foreground,
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const EndScene: React.FC<SP> = ({p}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clear = interpolate(f, [61, 73], [1, 0], clamp);
  const cs = pop(f, fps, 14);
  return (
    <AbsoluteFill>
      <div style={{opacity: clear}}>
        <div style={row(500)}>
          <BrandPill p={p} s={pop(f, fps, 6)} />
        </div>
        <div style={row(650)}>
          <Headline p={p} f={f} delay={10} max={130} />
        </div>
      </div>
      <div style={{...row(1380 - 80), height: 160, alignItems: 'center', opacity: interpolate(f, [57, 63], [1, 0], clamp)}}>
        <div
          data-text-role="cta"
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 900,
            fontSize: fit(p.texts.cta, 60, 620, 0.6),
            color: p.theme.background,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            transform: `translateY(${(1 - cs) * 40}px)`,
            opacity: Math.min(1, cs * 2),
          }}
        >
          {p.texts.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SCENES: React.FC<SP>[] = [TitleScene, PriceScene, EndScene];

export const Flashdrop: React.FC<FlashdropProps> = (props) => {
  const {theme} = props;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, ${theme.surface} 0%, ${theme.background} 70%)`,
        overflow: 'hidden',
      }}
    >
      <SpeedLines p={props} />
      <Carrier p={props} />
      {flashdropMeta.scenes.map((s, i) => {
        const Scene = SCENES[i];
        return (
          <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
            <Scene p={props} d={s.duration} />
          </Sequence>
        );
      })}
      <Vignette />
    </AbsoluteFill>
  );
};
