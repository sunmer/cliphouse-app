import React from 'react';
import {AbsoluteFill, Sequence, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Role, Theme} from '../../videos/contract';
import {ArrowIcon, Grain, clamp, easeIn, easeInOut, easeOut, fit} from '../../videos/shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../../videos/shared/fonts';
import {tickerListMeta as tickerMeta, tickerList} from './meta';
import {listItems} from '../lists';
import type {TickerListProps as TickerProps} from './schema';

loadTemplateFonts();

const S = 1080;
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CHAR = 0.7; // Archivo heavy uppercase width per em

// One endless band of repeated text.
const Band: React.FC<{text: string; size: number; color: string; dir: 1 | -1; speed: number; outline?: boolean; bg?: string}> = ({
  text,
  size,
  color,
  dir,
  speed,
  outline,
  bg,
}) => {
  const frame = useCurrentFrame();
  const unit = `${text.toUpperCase()}  \u2605  `;
  const unitWidth = unit.length * size * CHAR;
  const x = ((frame * speed * dir) % unitWidth) - unitWidth;
  return (
    <div style={{background: bg, padding: bg ? `${size * 0.12}px 0` : 0}}>
      <div
        style={{
          whiteSpace: 'pre',
          fontSize: size,
          fontWeight: 900,
          lineHeight: 0.92,
          transform: `translateX(${x}px)`,
          color: outline ? 'transparent' : color,
          WebkitTextStroke: outline ? `${Math.max(2, size / 50)}px ${color}` : undefined,
        }}
      >
        {unit.repeat(Math.ceil((S * 2.4) / unitWidth) + 2)}
      </div>
    </div>
  );
};

const Frame: React.FC<{theme: Theme; label: string; role: Role; ink?: string}> = ({theme, label, role, ink}) => {
  const frame = useCurrentFrame();
  const c = ink ?? theme.foreground;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: MONO_FONT, fontSize: 22, fontWeight: 600, color: c}}>
      <div style={{position: 'absolute', left: 48, right: 48, top: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span data-text-role={role} style={{textTransform: 'uppercase'}}>{label}</span>
        <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{width: 12, height: 12, borderRadius: 6, background: ink ? c : theme.accent, opacity: Math.floor(frame / 10) % 2 ? 0.25 : 1}} />
          {'LIVE'}
        </span>
      </div>
      <div style={{position: 'absolute', left: 48, right: 48, bottom: 40, display: 'flex', justifyContent: 'space-between', opacity: 0.6}}>
        <span>{String(frame).padStart(4, '0')}</span>
        <span>{'\u25A0 \u25A0 \u25A0'}</span>
      </div>
    </AbsoluteFill>
  );
};

const SceneMarquee: React.FC<TickerProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sticker = spring({frame: frame - 16, fps, config: {damping: 12, stiffness: 140}});
  const tilt = interpolate(frame, [0, 90], [-11, -7]);
  const zoom = interpolate(frame, [0, 90], [1.2, 1.08]);
  const bands = [
    {color: theme.foreground, outline: true},
    {color: theme.background, bg: theme.accent},
    {color: theme.foreground},
    {color: theme.accent2, outline: true},
    {color: theme.foreground},
  ];
  const brandSize = fit(texts.brand.toUpperCase(), 124, 700, CHAR);
  return (
    <AbsoluteFill style={{background: theme.background}}>
      <AbsoluteFill style={{justifyContent: 'center', gap: 22, transform: `rotate(${tilt}deg) scale(${zoom})`}}>
        {bands.map((b, i) => {
          const enter = interpolate(frame - i * 3, [0, 22], [i % 2 ? -700 : 700, 0], {...clamp, easing: easeOut});
          return (
            <div key={i} style={{transform: `translateX(${enter}px)`}}>
              <span data-text-role={"headline"} style={{display: 'contents'}}><Band text={texts.headline} size={168} dir={i % 2 ? 1 : -1} speed={7 + i * 1.5} {...b} /></span>
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            padding: '34px 58px 38px',
            background: theme.accent2,
            color: theme.background,
            borderRadius: 6,
            boxShadow: `14px 14px 0 ${theme.background}, 14px 14px 0 4px ${theme.foreground}`,
            fontSize: brandSize,
            fontWeight: 900,
            lineHeight: 0.95,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            transform: `scale(${sticker}) rotate(${(1 - sticker) * 24 - 4}deg)`,
          }}
        >
          <span data-text-role={"brand"} style={{display: 'contents'}}>{texts.brand}</span>
        </div>
      </AbsoluteFill>
      <Frame theme={theme} label={texts.brand} role="brand" />
    </AbsoluteFill>
  );
};

// Split-flap row: cells flicker through glyphs, then settle left to right.
const Flap: React.FC<{text: string; cells: number; delay: number; color: string; theme: Theme; size: number}> = ({
  text,
  cells,
  delay,
  color,
  theme,
  size,
}) => {
  const frame = useCurrentFrame();
  const chars = text.toUpperCase().padEnd(cells, ' ').split('');
  return (
    <div style={{display: 'flex', gap: size * 0.08}}>
      {chars.map((ch, i) => {
        const t = frame - delay - i * 0.8;
        const spinning = t >= 0 && t < 9 && ch !== ' ';
        const shown = t < 0 ? '' : spinning ? GLYPHS[Math.floor(random(`${text}${i}${frame}`) * GLYPHS.length)] : ch;
        return (
          <div
            key={i}
            style={{
              width: size * 0.74,
              height: size * 1.16,
              borderRadius: size * 0.08,
              background: `linear-gradient(180deg, ${theme.surface} 0 49%, ${theme.background} 49% 51%, ${theme.surface} 51%)`,
              boxShadow: `inset 0 -${size * 0.05}px 0 rgba(0,0,0,0.25)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONO_FONT,
              fontSize: size * 0.86,
              fontWeight: 800,
              color: spinning ? `${color}aa` : color,
              transform: `scaleY(${spinning && frame % 2 ? 0.86 : 1})`,
            }}
          >
            {shown}
          </div>
        );
      })}
    </div>
  );
};

const SceneBoard: React.FC<TickerProps> = (props) => {
  const {texts, theme} = props;
  const frame = useCurrentFrame();
  // One row per list item. Fewer items get larger cells and more air; the entrance timing stays the same.
  const items = listItems(tickerList, props);
  const lead = Math.floor(items.length / 2);
  const cells = Math.max(8, ...items.map((t) => t.length));
  const size = Math.min([100, 132, 116, 100][items.length] ?? 100, (S - 96 - 110) / (cells * 0.82));
  const enter = interpolate(frame, [0, 14], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{background: theme.background, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: `translateY(${(1 - enter) * 80}px)`, opacity: enter, display: 'flex', flexDirection: 'column', gap: [34, 58, 44, 34][items.length] ?? 34}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: MONO_FONT, color: theme.foreground}}>
          <span style={{fontSize: 30, fontWeight: 800, color: theme.accent, textTransform: 'uppercase'}}><span data-text-role={"headline"} style={{display: 'contents'}}>{texts.headline}</span></span>
          <span style={{fontSize: 22, opacity: 0.55}}>{'STATUS \u2192 ON'}</span>
        </div>
        <div style={{height: 3, background: theme.foreground, opacity: 0.2}} />
        {items.map((t, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <span style={{width: 82, fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, color: i === lead ? theme.accent : `${theme.foreground}88`}}>{`0${i + 1}`}</span>
            <span data-text-role={`point${i + 1}`} style={{display: 'contents'}}><Flap text={t} cells={cells} delay={6 + i * 7} size={size} theme={theme} color={i === lead ? theme.accent2 : theme.foreground} /></span>
          </div>
        ))}
        <div style={{height: 3, background: theme.foreground, opacity: 0.2}} />
      </div>
      <Frame theme={theme} label={texts.brand} role="brand" />
    </AbsoluteFill>
  );
};

const SceneStamp: React.FC<TickerProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const word = spring({frame: frame - 8, fps, config: {damping: 13, stiffness: 150}});
  const stamp = spring({frame: frame - 22, fps, config: {damping: 10, stiffness: 210}});
  const brandSize = fit(texts.brand.toUpperCase(), 210, 940, CHAR);
  return (
    <AbsoluteFill style={{background: theme.accent}}>
      <AbsoluteFill style={{top: 'auto', height: 150, justifyContent: 'center', background: theme.background, overflow: 'hidden'}}>
        <span data-text-role={"cta"} style={{display: 'contents'}}><Band text={texts.cta} size={84} color={theme.accent2} dir={-1} speed={6} /></span>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 64, paddingBottom: 150}}>
        <div style={{overflow: 'hidden', padding: '0 10px'}}>
          <div
            style={{
              fontSize: brandSize,
              fontWeight: 900,
              lineHeight: 0.95,
              color: theme.background,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              transform: `translateY(${(1 - word) * 110}%)`,
            }}
          >
            <span data-text-role={"brand"} style={{display: 'contents'}}>{texts.brand}</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '28px 48px',
            borderRadius: 999,
            background: theme.background,
            color: theme.accent2,
            fontSize: fit(texts.cta.toUpperCase(), 54, 620, CHAR),
            fontWeight: 900,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            transform: `scale(${interpolate(stamp, [0, 1], [1.9, 1])}) rotate(${interpolate(stamp, [0, 1], [-10, -3])}deg)`,
            opacity: Math.min(1, stamp * 2),
          }}
        >
          <span data-text-role={"cta"} style={{display: 'contents'}}>{texts.cta}</span>
          <ArrowIcon size={48} />
        </div>
      </AbsoluteFill>
      <Frame theme={theme} label={texts.headline} role="headline" ink={theme.background} />
    </AbsoluteFill>
  );
};

// A diagonal three-color slash that covers each cut.
const Slash: React.FC<{theme: Theme}> = ({theme}) => {
  const frame = useCurrentFrame();
  const x = frame < 9
    ? interpolate(frame, [0, 9], [-150, 0], {...clamp, easing: easeInOut})
    : interpolate(frame, [9, 18], [0, 150], {...clamp, easing: easeIn});
  return (
    <AbsoluteFill style={{transform: `translateX(${x}%) skewX(-14deg) scale(1.5)`}}>
      <AbsoluteFill style={{background: theme.accent2, right: '55%'}} />
      <AbsoluteFill style={{background: theme.foreground, left: '45%', right: '40%'}} />
      <AbsoluteFill style={{background: theme.accent, left: '60%'}} />
    </AbsoluteFill>
  );
};

const SCENES: React.FC<TickerProps>[] = [SceneMarquee, SceneBoard, SceneStamp];

export const TickerList: React.FC<TickerProps> = (props) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 8], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill style={{fontFamily: DISPLAY, overflow: 'hidden', background: props.theme.background, opacity: intro}}>
      {tickerMeta.scenes.map((s, i) => {
        const Scene = SCENES[i];
        return (
          <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
            <Scene {...props} />
          </Sequence>
        );
      })}
      {tickerMeta.scenes.slice(1).map((s) => (
        <Sequence key={s.from} name="transition" from={s.from - 9} durationInFrames={18}>
          <Slash theme={props.theme} />
        </Sequence>
      ))}
      <Grain />
    </AbsoluteFill>
  );
};
