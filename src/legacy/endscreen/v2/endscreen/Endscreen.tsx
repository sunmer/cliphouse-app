import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../contract';
import {clamp, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack, type SceneProps} from '../shared/scenes';
import {endscreenMeta} from './meta';
import type {EndscreenProps} from './schema';

loadTemplateFonts();

const W = 1920;
const H = 1080;
type P = SceneProps<EndscreenProps>;

const Backdrop: React.FC<{theme: Theme}> = ({theme}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: theme.background}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: -200 + ((frame * (1 + i * 0.4) + i * 700) % 2400), top: 120 + i * 330, width: 900, height: 3, background: `${[theme.accent, theme.accent2, theme.foreground][i]}${i === 2 ? '18' : '55'}`}} />
      ))}
    </AbsoluteFill>
  );
};

const SceneThanks: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const words = texts.headline.split(' ');
  const size = wrapFit(texts.headline, 150, 1500, 2, 0.56);
  const sub = interpolate(frame, [28, 46], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 160}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: size * 0.24, fontFamily: DISPLAY, fontSize: size, lineHeight: 1, fontWeight: 900, color: theme.foreground}}>
        <span data-text-role="headline" style={{display: 'contents'}}>{words.map((w, i) => {
          const t = interpolate(frame - i * 5, [0, 18], [0, 1], {...clamp, easing: easeOut});
          return <span key={i} style={{display: 'inline-block', overflow: 'hidden'}}><span style={{display: 'inline-block', transform: `translateY(${(1 - t) * 110}%)`}}>{w}</span></span>;
        })}</span>
      </div>
      <div style={{marginTop: 40, fontSize: 44, color: `${theme.foreground}bb`, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`}}>
        <span data-text-role="subhead" style={{display: 'contents'}}>{texts.subhead}</span>
      </div>
    </AbsoluteFill>
  );
};

// Empty slots match YouTube's end-screen elements: two videos and one subscribe circle.
const Slot: React.FC<{theme: Theme; x: number; delay: number; role: 'point1' | 'point2'; label: string}> = ({theme, x, delay, role, label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 120}});
  const pulse = 0.5 + Math.sin((frame - delay) / 12) * 0.5;
  return (
    <div style={{position: 'absolute', left: x, top: 330, width: 640, transform: `translateY(${(1 - s) * 140}px)`, opacity: s}}>
      <div style={{height: 360, borderRadius: 8, border: `4px dashed ${theme.foreground}${pulse > 0.5 ? '66' : '44'}`, background: `${theme.surface}88`}} />
      <div style={{marginTop: 24, fontSize: fit(label, 40, 640, 0.56), fontWeight: 760, color: theme.foreground, whiteSpace: 'nowrap'}}>
        <span data-text-role={role} style={{display: 'contents'}}>{label}</span>
      </div>
    </div>
  );
};

const SceneEnd: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brand = interpolate(frame, [0, 20], [0, 1], {...clamp, easing: easeOut});
  const ring = spring({frame: frame - 28, fps, config: {damping: 12, stiffness: 140}});
  const breathe = 1 + Math.sin(frame / 18) * 0.025;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 140, top: 140, fontFamily: DISPLAY, fontSize: fit(texts.brand, 72, 1100, 0.64), fontWeight: 900, color: theme.foreground, opacity: brand, transform: `translateX(${(1 - brand) * -60}px)`}}>
        <span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span>
      </div>
      <Slot theme={theme} x={140} delay={10} role="point1" label={texts.point1} />
      <Slot theme={theme} x={830} delay={18} role="point2" label={texts.point2} />
      <div style={{position: 'absolute', left: 1530, top: 370, width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        <div style={{width: 260, height: 260, borderRadius: '50%', border: `8px solid ${theme.accent}`, background: `${theme.surface}aa`, transform: `scale(${ring * breathe})`}} />
        <div style={{padding: '18px 30px', borderRadius: 8, background: theme.accent, color: theme.foreground, fontSize: fit(texts.cta, 38, 300, 0.58), fontWeight: 820, whiteSpace: 'nowrap', opacity: ring}}>
          <span data-text-role="cta" style={{display: 'contents'}}>{texts.cta}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Endscreen: React.FC<EndscreenProps> = (props) => (
  <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', fontFamily: SANS_FONT}}>
    <Backdrop theme={props.theme} />
    <SceneTrack meta={endscreenMeta} scenes={[SceneThanks, SceneEnd]} props={props} />
  </AbsoluteFill>
);
