import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, easeOut, fit} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {SceneTrack, type SceneProps} from '../shared/scenes';
import {kineticMeta} from './meta';
import type {KineticProps} from './schema';

loadTemplateFonts();

const S = 1080;
const PAD = 80;
type P = SceneProps<KineticProps>;

// Each headline word gets its own line, size, and entrance direction.
const SceneWords: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = texts.headline.trim().split(/\s+/);
  const rows = words.length;
  const lineH = Math.min(250, (S - PAD * 2) / rows);
  return (
    <AbsoluteFill style={{padding: PAD, justifyContent: 'center'}}>
      <span data-text-role="headline" style={{display: 'contents'}}>{words.map((word, i) => {
        const s = spring({frame: frame - 6 - i * 9, fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
        const dir = i % 2 ? 1 : -1;
        const color = i === rows - 1 ? theme.accent : i % 3 === 1 ? theme.accent2 : theme.foreground;
        return (
          <div key={i} style={{height: lineH, display: 'flex', alignItems: 'center', justifyContent: i % 2 ? 'flex-end' : 'flex-start', overflow: 'hidden'}}>
            <span style={{fontFamily: DISPLAY, fontSize: Math.min(lineH * 0.92, fit(word, 260, S - PAD * 2, 0.78)), lineHeight: 1, fontWeight: 900, textTransform: 'uppercase', color, transform: `translateX(${(1 - s) * dir * 700}px) skewX(${(1 - s) * dir * -18}deg)`}}>
              {word}
            </span>
          </div>
        );
      })}</span>
    </AbsoluteFill>
  );
};

// Three quick flashes, then all three words stack so each stays editable.
const SceneFlash: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = [texts.point1, texts.point2, texts.point3];
  const slot = 13;
  const stackAt = slot * 3;
  if (frame >= stackAt) {
    return (
      <AbsoluteFill>
        {items.map((item, i) => {
          const s = spring({frame: frame - stackAt - i * 3, fps, config: {damping: 16, stiffness: 170}});
          const bg = [theme.accent, theme.foreground, theme.accent2][i];
          const fg = i === 1 ? theme.background : theme.foreground;
          return (
            <div key={i} style={{position: 'absolute', left: 0, top: (S / 3) * i, width: S, height: S / 3 + 1, background: bg, display: 'flex', alignItems: 'center', padding: `0 ${PAD}px`, gap: 30, transform: `translateX(${(1 - s) * (i % 2 ? 1 : -1) * S}px)`}}>
              <span style={{fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, color: fg}}>0{i + 1}</span>
              <span style={{fontFamily: DISPLAY, fontSize: fit(item, 170, S - PAD * 2 - 90, 0.78), fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, color: fg, whiteSpace: 'nowrap'}}>
                <span data-text-role={`point${i + 1}`} style={{display: 'contents'}}>{item}</span>
              </span>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      {items.map((item, i) => {
        const local = frame - i * slot;
        if (local < 0 || local > slot) return null;
        const zoom = interpolate(local, [0, 8], [1.6, 1], {...clamp, easing: easeOut});
        const wipe = interpolate(local, [0, 7], [0, 1], {...clamp, easing: easeInOut});
        const bg = [theme.accent, theme.foreground, theme.accent2][i];
        const fg = i === 1 ? theme.background : theme.foreground;
        return (
          <AbsoluteFill key={i} style={{background: bg, clipPath: `circle(${wipe * 80}% at ${[20, 80, 50][i]}% ${[30, 70, 50][i]}%)`, justifyContent: 'center', alignItems: 'center', padding: PAD}}>
            <div style={{fontFamily: MONO_FONT, position: 'absolute', top: PAD, left: PAD, fontSize: 30, fontWeight: 700, color: fg}}>0{i + 1}</div>
            <div style={{fontFamily: DISPLAY, fontSize: fit(item, 190, S - PAD * 2, 0.78), fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, color: fg, whiteSpace: 'nowrap', transform: `scale(${zoom})`}}>
              {item}
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneOutro: React.FC<P> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = texts.subhead.split(' ');
  const brand = spring({frame: frame - 14, fps, config: {damping: 16, stiffness: 130}});
  const cta = interpolate(frame, [22, 36], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{padding: PAD, justifyContent: 'space-between'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', columnGap: 16, fontSize: 60, lineHeight: 1.12, fontWeight: 780, color: theme.foreground}}>
        <span data-text-role="subhead" style={{display: 'contents'}}>{words.map((w, i) => {
          const t = interpolate(frame - i * 3, [0, 14], [0, 1], {...clamp, easing: easeOut});
          return <span key={i} style={{display: 'inline-block', opacity: t, transform: `translateY(${(1 - t) * 40}px)`}}>{w}</span>;
        })}</span>
      </div>
      <div>
        <div style={{fontFamily: DISPLAY, fontSize: fit(texts.brand, 170, S - PAD * 2, 0.8), lineHeight: 0.95, whiteSpace: "nowrap", fontWeight: 900, textTransform: 'uppercase', color: theme.accent, transform: `translateY(${(1 - brand) * 220}px)`, opacity: brand}}>
          <span data-text-role="brand" style={{display: 'contents'}}>{texts.brand}</span>
        </div>
        <div style={{marginTop: 30, display: 'inline-flex', padding: '20px 34px', background: theme.foreground, color: theme.background, fontSize: fit(texts.cta, 40, 600, 0.56), fontWeight: 800, opacity: cta, clipPath: `inset(0 ${(1 - cta) * 100}% 0 0)`}}>
          <span data-text-role="cta" style={{display: 'contents'}}>{texts.cta}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Kinetic: React.FC<KineticProps> = (props) => (
  <AbsoluteFill style={{width: S, height: S, overflow: 'hidden', background: props.theme.background, fontFamily: SANS_FONT}}>
    <SceneTrack meta={kineticMeta} scenes={[SceneWords, SceneFlash, SceneOutro]} props={props} />
  </AbsoluteFill>
);
