import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../contract';
import {clamp, easeInOut, easeOut, fit} from '../shared/motion';
import {MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack, type SceneProps} from '../shared/scenes';
import {lowerthirdMeta} from './meta';
import type {LowerthirdProps} from './schema';

loadTemplateFonts();

const W = 1920;
const H = 1080;
const LEFT = 140;
const BOTTOM = 150;
type P = SceneProps<LowerthirdProps>;

// A soft interview frame stands in for footage, so the overlays read in context.
const Footage: React.FC<{theme: Theme}> = ({theme}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 12;
  return (
    <AbsoluteFill style={{background: `linear-gradient(120deg, ${theme.background}, ${theme.surface})`}}>
      <div style={{position: 'absolute', left: 1180 + drift, top: 250, width: 300, height: 340, borderRadius: '50%', background: `${theme.foreground}1c`}} />
      <div style={{position: 'absolute', left: 980 + drift, top: 600, width: 700, height: 600, borderRadius: '48% 48% 0 0', background: `${theme.foreground}14`}} />
      <div style={{position: 'absolute', left: 120, top: 120, width: 520, height: 680, borderRadius: 8, background: `${theme.foreground}08`}} />
      <AbsoluteFill style={{background: `linear-gradient(0deg, ${theme.background}cc, transparent 46%)`}} />
    </AbsoluteFill>
  );
};

const SceneName: React.FC<P> = ({texts, theme, duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bar = spring({frame, fps, config: {damping: 18, stiffness: 120}});
  const title = spring({frame: frame - 9, fps, config: {damping: 18, stiffness: 120}});
  const out = interpolate(frame, [duration - 14, duration], [0, 1], {...clamp, easing: easeInOut});
  const nameSize = fit(texts.brand, 76, 860, 0.6);
  return (
    <AbsoluteFill style={{transform: `translateX(${out * -900}px)`}}>
      <div style={{position: 'absolute', left: LEFT, bottom: BOTTOM + 70, display: 'flex', alignItems: 'stretch', clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)`}}>
        <div style={{width: 18, background: theme.accent}} />
        <div style={{padding: '18px 40px 18px 30px', background: theme.foreground, color: theme.background, fontSize: nameSize, lineHeight: 1.05, fontWeight: 820, whiteSpace: 'nowrap'}}>
          <span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: LEFT + 18, bottom: BOTTOM, padding: '14px 30px', background: theme.accent, color: theme.foreground, fontSize: fit(texts.headline, 38, 800, 0.58), fontWeight: 650, whiteSpace: 'nowrap', clipPath: `inset(0 ${(1 - title) * 100}% 0 0)`}}>
        <span data-text-role="headline" style={{display: 'contents'}}>{texts.headline}</span>
      </div>
    </AbsoluteFill>
  );
};

const SceneTopic: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [0, 24], [0, 1], {...clamp, easing: easeInOut});
  const tag = interpolate(frame, [8, 26], [0, 1], {...clamp, easing: easeOut});
  const copy = interpolate(frame, [16, 36], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, bottom: BOTTOM + 132, height: 4, width: 1100 * line, background: theme.accent2}} />
      <div style={{position: 'absolute', left: LEFT, bottom: BOTTOM + 160, fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, color: theme.accent2, textTransform: 'uppercase', opacity: tag, transform: `translateY(${(1 - tag) * 18}px)`}}>
        <span data-text-role="point1" style={{display: 'contents'}}>{texts.point1}</span>
      </div>
      <div style={{position: 'absolute', left: LEFT, bottom: BOTTOM + 20, width: 1200, fontSize: fit(texts.subhead, 58, 1200, 0.55), lineHeight: 1.12, fontWeight: 760, color: theme.foreground, opacity: copy, transform: `translateY(${(1 - copy) * 30}px)`}}>
        <span data-text-role="subhead" style={{display: 'contents'}}>{texts.subhead}</span>
      </div>
    </AbsoluteFill>
  );
};

const SceneSocial: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 13, stiffness: 150}});
  const text = interpolate(frame, [10, 28], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', right: LEFT, bottom: BOTTOM, height: 112, display: 'flex', alignItems: 'center', gap: 26, padding: '0 46px 0 18px', borderRadius: 56, background: `${theme.background}e6`, border: `3px solid ${theme.accent}`, transform: `scale(${pop})`, transformOrigin: '100% 50%'}}>
        <div style={{width: 78, height: 78, borderRadius: '50%', background: theme.accent, display: 'grid', placeItems: 'center', color: theme.foreground, fontSize: 40, fontWeight: 850}}>{texts.brand.slice(0, 1).toUpperCase()}</div>
        <div style={{display: 'flex', flexDirection: 'column', opacity: text}}>
          <span style={{fontSize: 26, fontWeight: 600, color: `${theme.foreground}aa`, whiteSpace: 'nowrap'}}><span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span></span>
          <span style={{fontSize: fit(texts.cta, 42, 600, 0.58), fontWeight: 800, color: theme.foreground, whiteSpace: 'nowrap'}}><span data-text-role="cta" style={{display: 'contents'}}>{texts.cta}</span></span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Lowerthird: React.FC<LowerthirdProps> = (props) => (
  <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', fontFamily: SANS_FONT}}>
    <Footage theme={props.theme} />
    <SceneTrack meta={lowerthirdMeta} scenes={[SceneName, SceneTopic, SceneSocial]} props={props} />
  </AbsoluteFill>
);
