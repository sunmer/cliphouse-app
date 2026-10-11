import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack, type SceneProps} from '../shared/scenes';
import {ytintroMeta} from './meta';
import type {YtintroProps} from './schema';

loadTemplateFonts();

const W = 1920;
const H = 1080;
type P = SceneProps<YtintroProps>;

// Color bars slam across the frame before the channel name lands.
const SceneBars: React.FC<P> = ({theme}) => {
  const frame = useCurrentFrame();
  const colors = [theme.accent, theme.accent2, theme.foreground, theme.surface, theme.accent];
  return (
    <AbsoluteFill>
      {colors.map((c, i) => {
        const t = interpolate(frame - i * 3, [0, 16], [0, 1], {...clamp, easing: easeInOut});
        const out = interpolate(frame - i * 2, [24, 38], [0, 1], {...clamp, easing: easeInOut});
        return <div key={i} style={{position: 'absolute', left: 0, top: (H / colors.length) * i, height: H / colors.length + 1, width: W, background: c, transform: `translateX(${(i % 2 ? 1 : -1) * (1 - t + out) * W}px)`}} />;
      })}
    </AbsoluteFill>
  );
};

const SceneName: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12, stiffness: 170}});
  const glitch = frame < 18 ? (random(`g${frame}`) - 0.5) * 40 : 0;
  const sub = interpolate(frame, [20, 38], [0, 1], {...clamp, easing: easeOut});
  const cta = interpolate(frame, [52, 70], [0, 1], {...clamp, easing: easeOut});
  const size = fit(texts.brand, 230, 1600, 0.68);
  const layer = (color: string, dx: number) => (
    <div style={{position: 'absolute', inset: 0, color, transform: `translateX(${dx}px)`, mixBlendMode: 'screen'}}>{texts.brand}</div>
  );
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', fontFamily: DISPLAY, fontSize: size, lineHeight: 1, fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', transform: `scale(${0.6 + s * 0.4}) skewX(${glitch * 0.3}deg)`}}>
        {glitch ? layer(theme.accent, glitch) : null}
        {glitch ? layer(theme.accent2, -glitch) : null}
        <div style={{position: 'relative', color: theme.foreground}}><span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span></div>
      </div>
      <div style={{marginTop: 34, display: 'flex', alignItems: 'center', gap: 24, opacity: sub, transform: `translateY(${(1 - sub) * 30}px)`}}>
        <div style={{width: 80 * sub, height: 6, background: theme.accent}} />
        <span style={{fontSize: fit(texts.headline, 54, 1200, 0.56), fontWeight: 700, color: theme.foreground}}><span data-text-role="headline" style={{display: 'contents'}}>{texts.headline}</span></span>
        <div style={{width: 80 * sub, height: 6, background: theme.accent2}} />
      </div>
      <div style={{position: 'absolute', bottom: 110, fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, padding: '12px 26px', borderRadius: 8, background: theme.accent, color: theme.foreground, opacity: cta}}>
        <span data-text-role="cta" style={{display: 'contents'}}>{texts.cta}</span>
      </div>
    </AbsoluteFill>
  );
};

export const Ytintro: React.FC<YtintroProps> = (props) => (
  <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: props.theme.background, fontFamily: SANS_FONT}}>
    <SceneTrack meta={ytintroMeta} scenes={[SceneBars, SceneName]} props={props} exit="none" />
  </AbsoluteFill>
);
