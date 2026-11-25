import React from 'react';
import {AbsoluteFill, Sequence, interpolate, random, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {clamp, fit, wrapFit} from '../shared/motion';
import {retroconsoleMeta} from './meta';
import type {RetroconsoleProps} from './schema';

loadTemplateFonts();

type SceneFC = React.FC<RetroconsoleProps>;

// Stepped (8-bit) timing: frames snap to n-frame steps before interpolation.
const step = (f: number, n = 3) => Math.floor(f / n) * n;
const lerp = (f: number, input: number[], output: number[], n = 3) => interpolate(step(f, n), input, output, clamp);

const pixelClip = (w: number, h: number, c: number) =>
  `polygon(0 ${c}px, ${c}px ${c}px, ${c}px 0, ${w - c}px 0, ${w - c}px ${c}px, ${w}px ${c}px, ${w}px ${h - c}px, ${w - c}px ${h - c}px, ${w - c}px ${h}px, ${c}px ${h}px, ${c}px ${h - c}px, 0 ${h - c}px)`;

// The carrier: one bezel that is on screen from frame 0 to 179.
const Carrier: React.FC<{theme: RetroconsoleProps['theme']}> = ({theme}) => {
  const f = useCurrentFrame();
  const w = lerp(f, [0, 6, 58, 70, 116, 128, 170, 176], [12, 1640, 1640, 1560, 1560, 1240, 1240, 12], 2);
  const h = lerp(f, [0, 6, 14, 58, 70, 116, 128, 164, 170], [12, 12, 920, 920, 600, 600, 780, 780, 12], 2);
  const b = Math.min(16, h / 2, w / 2);
  const big = h > 100 && w > 100;
  const grid = lerp(f, [14, 40], [100, 0], 3);
  const cart = f < 164 ? lerp(f, [120, 128], [0, 1], 4) : 0;
  const notchH = cart * 70;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: 540 - h / 2 - notchH + 2,
          width: 420,
          height: notchH,
          background: theme.accent,
          clipPath: 'polygon(0 100%, 0 40%, 8% 40%, 8% 0, 92% 0, 92% 40%, 100% 40%, 100% 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          boxSizing: 'border-box',
          border: `${b}px solid ${theme.accent}`,
          background: big ? theme.surface : theme.accent,
          clipPath: big ? pixelClip(w, h, 16) : undefined,
        }}
      >
        {big && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `inset(0 0 ${grid}% 0)`,
              backgroundImage: `linear-gradient(${theme.background}aa 2px, transparent 2px), linear-gradient(90deg, ${theme.background}aa 2px, transparent 2px)`,
              backgroundSize: '48px 48px',
            }}
          />
        )}
        {big && cart > 0 && (
          <div style={{position: 'absolute', inset: 20, border: `8px solid ${theme.accent2}`, clipPath: pixelClip(w - 72, h - 72, 12)}} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const Boot: SceneFC = ({texts, theme}) => {
  const f = useCurrentFrame();
  const pop = lerp(f, [12, 15, 18, 21], [0, 0.6, 1.12, 1], 3);
  const out = lerp(f, [54, 62], [1, 0], 2);
  const blocks = Math.floor(lerp(f, [20, 48], [0, 12], 2));
  const size = fit(texts.brand, 84, 980, 0.72);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scaleY(${out})`}}>
      <div style={{transform: `scale(${pop})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
        <div
          style={{
            background: theme.accent,
            padding: '22px 48px',
            clipPath: 'polygon(0 12px, 12px 12px, 12px 0, calc(100% - 12px) 0, calc(100% - 12px) 12px, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 12px calc(100% - 12px), 0 calc(100% - 12px))',
            boxShadow: `10px 10px 0 ${theme.accent2}`,
          }}
        >
          <div data-text-role="brand" style={{fontFamily: DISPLAY, fontSize: size, fontWeight: 900, color: theme.background, whiteSpace: 'nowrap', lineHeight: 1}}>
            {texts.brand}
          </div>
        </div>
        <div style={{display: 'flex', gap: 10}}>
          {Array.from({length: 12}, (_, i) => (
            <div key={i} style={{width: 34, height: 22, background: i < blocks ? (i % 4 === 3 ? theme.accent2 : theme.foreground) : `${theme.background}cc`}} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Title: SceneFC = ({texts, theme}) => {
  const f = useCurrentFrame();
  const y = lerp(f, [4, 16, 20, 24], [-300, 0, 16, 0], 4);
  const layers = Math.floor(lerp(f, [14, 26], [0, 4], 3));
  const shadow = Array.from({length: layers}, (_, i) => `${(i + 1) * 6}px ${(i + 1) * 6}px 0 ${theme.accent2}`).join(', ') || 'none';
  const typed = Math.floor(interpolate(f, [22, 38], [0, texts.subhead.length], clamp));
  const out = lerp(f, [62, 74], [1, 0], 2);
  const hSize = fit(texts.headline, 150, 1340, 0.74);
  const sSize = wrapFit(texts.subhead, 46, 1240, 2, 0.62, 26);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scaleY(${out})`}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44, width: 1400}}>
        <div
          data-text-role="headline"
          style={{fontFamily: DISPLAY, fontSize: hSize, fontWeight: 900, color: theme.foreground, textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1, transform: `translateY(${y}px)`, textShadow: shadow}}
        >
          {texts.headline}
        </div>
        <div data-text-role="subhead" style={{fontFamily: MONO_FONT, fontSize: sSize, color: theme.accent, textAlign: 'center', width: 1260, lineHeight: 1.3}}>
          <span>{texts.subhead.slice(0, typed)}</span>
          <span style={{opacity: 0}}>{texts.subhead.slice(typed)}</span>
          <span style={{display: 'inline-block', width: sSize * 0.55, height: sSize * 0.9, marginLeft: 6, verticalAlign: 'middle', background: theme.foreground, opacity: Math.floor(f / 8) % 2 ? 0 : 1}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Start: SceneFC = ({texts, theme}) => {
  const f = useCurrentFrame();
  const enter = lerp(f, [10, 18], [0, 1], 2);
  const out = lerp(f, [49, 55], [1, 0], 2);
  const stamp = lerp(f, [14, 18, 22, 26], [0, 1.3, 0.92, 1], 4);
  const lit = f < 24 || Math.floor(f / 8) % 2 === 0;
  const ctaSize = fit(texts.cta, 76, 760, 0.72);
  const brandSize = fit(texts.brand, 44, 640, 0.7);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scaleY(${enter * out})`}}>
      {Array.from({length: 16}, (_, i) => {
        const a = random(`ang${i}`) * Math.PI * 2;
        const d = lerp(f, [14, 32], [0, 260 + random(`dist${i}`) * 320], 3);
        const vis = f >= 14 && f < 34;
        return (
          <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * d - 10, top: 640 + Math.sin(a) * d * 0.6 - 10, width: 20, height: 20, background: i % 2 ? theme.accent : theme.accent2, opacity: vis ? 1 : 0}} />
        );
      })}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 120}}>
        <div style={{background: theme.background, border: `6px solid ${theme.foreground}`, padding: '16px 40px'}}>
          <div data-text-role="brand" style={{fontFamily: DISPLAY, fontSize: brandSize, fontWeight: 900, color: theme.foreground, letterSpacing: 4, whiteSpace: 'nowrap', lineHeight: 1}}>
            {texts.brand}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            transform: `scale(${stamp})`,
            background: lit ? theme.accent : theme.accent2,
            padding: '28px 64px',
            borderRadius: 999,
            boxShadow: `0 12px 0 ${theme.background}`,
          }}
        >
          <div style={{width: 0, height: 0, borderTop: `${ctaSize * 0.4}px solid transparent`, borderBottom: `${ctaSize * 0.4}px solid transparent`, borderLeft: `${ctaSize * 0.6}px solid ${theme.background}`, opacity: lit ? 1 : 0}} />
          <div data-text-role="cta" style={{fontFamily: DISPLAY, fontSize: ctaSize, fontWeight: 900, color: theme.background, whiteSpace: 'nowrap', lineHeight: 1}}>
            {texts.cta}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SCENES: SceneFC[] = [Boot, Title, Start];

export const Retroconsole: React.FC<RetroconsoleProps> = (props) => {
  const f = useCurrentFrame();
  const {theme} = props;
  const flash = lerp(f, [4, 6, 12], [0, 0.85, 0], 2);
  const scan = interpolate(f, [100, 130], [0.35, 0.6], clamp);
  return (
    <AbsoluteFill style={{background: theme.background, overflow: 'hidden'}}>
      <Carrier theme={theme} />
      {retroconsoleMeta.scenes.map((s, i) => {
        const Scene = SCENES[i];
        return (
          <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
            <Scene {...props} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: theme.foreground, opacity: flash, pointerEvents: 'none'}} />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: scan,
          backgroundImage: `repeating-linear-gradient(0deg, ${theme.background}88 0px, ${theme.background}88 2px, transparent 2px, transparent 5px)`,
          backgroundPosition: `0 ${step(f, 2) % 10}px`,
        }}
      />
      <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse at center, transparent 60%, ${theme.background}cc 100%)`}} />
    </AbsoluteFill>
  );
};
