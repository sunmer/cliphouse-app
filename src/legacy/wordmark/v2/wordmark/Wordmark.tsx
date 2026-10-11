import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack, type SceneProps} from '../shared/scenes';
import {wordmarkMeta} from './meta';
import type {WordmarkProps} from './schema';

loadTemplateFonts();

const W = 1920;
const H = 1080;
type P = SceneProps<WordmarkProps>;

const Mark: React.FC<{text: string; size: number; color: string; frame: number}> = ({text, size, color, frame}) => (
  <div style={{display: 'flex', fontFamily: DISPLAY, fontSize: size, lineHeight: 1, fontWeight: 900, color, whiteSpace: 'pre'}}>
    <span data-text-role="brand" style={{display: 'contents'}}>{[...text].map((ch, i) => {
      const t = interpolate(frame - 20 - i * 1.5, [0, 16], [0, 1], {...clamp, easing: easeOut});
      return <span key={i} style={{display: 'inline-block', clipPath: `inset(${(1 - t) * 100}% 0 0 0)`, transform: `translateY(${(1 - t) * 30}px)`}}>{ch}</span>;
    })}</span>
  </div>
);

const SceneReveal: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const size = fit(texts.brand, 220, 1500, 0.66);
  const dot = spring({frame, fps, config: {damping: 12, stiffness: 120}});
  const line = interpolate(frame, [12, 40], [0, 1], {...clamp, easing: easeInOut});
  const burst = interpolate(frame, [20, 60], [0, 1], {...clamp, easing: easeOut});
  const sub = interpolate(frame, [42, 58], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'absolute', width: 1400 * burst, height: 1400 * burst, borderRadius: '50%', border: `3px solid ${theme.accent}`, opacity: 1 - burst}} />
      <div style={{position: 'absolute', width: 34 * dot, height: 34 * dot, borderRadius: '50%', background: theme.accent, opacity: 1 - line}} />
      <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Mark text={texts.brand} size={size} color={theme.foreground} frame={frame} />
        <div style={{marginTop: 26, height: 10, width: `${line * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`}} />
        <div style={{marginTop: 40, fontFamily: MONO_FONT, fontSize: 34, fontWeight: 600, color: `${theme.foreground}aa`, opacity: sub, letterSpacing: 0}}>
          <span data-text-role="headline" style={{display: 'contents'}}>{texts.headline}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneEnd: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const shrink = interpolate(frame, [0, 18], [0, 1], {...clamp, easing: easeInOut});
  const cta = interpolate(frame, [10, 26], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: theme.accent, clipPath: `circle(${shrink * 120}% at 50% 50%)`}}>
      <div style={{fontFamily: DISPLAY, fontSize: fit(texts.brand, 170, 1400, 0.66), fontWeight: 900, color: theme.background}}>
        <span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span>
      </div>
      <div style={{marginTop: 34, fontSize: fit(texts.cta, 44, 900, 0.56), fontWeight: 700, color: theme.background, opacity: cta}}>
        <span data-text-role="cta" style={{display: 'contents'}}>{texts.cta}</span>
      </div>
    </AbsoluteFill>
  );
};

export const Wordmark: React.FC<WordmarkProps> = (props) => (
  <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: props.theme.background, fontFamily: SANS_FONT}}>
    <SceneTrack meta={wordmarkMeta} scenes={[SceneReveal, SceneEnd]} props={props} exit="none" />
  </AbsoluteFill>
);
