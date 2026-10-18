import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import type {Theme} from '../contract';
import {GlassCaption, WhipPan} from '../effects/effects';
import {parseChart} from '../shared/data';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {clamp, easeIn, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {launchcutMeta as meta} from './meta';
import type {LaunchcutProps} from './schema';

loadTemplateFonts();

type Texts = LaunchcutProps['texts'];
type SceneP = {f: number; texts: Texts; theme: Theme};

const W = 1080;
const PAD = 90;
const CW = W - PAD * 2;
const BASE = 820;
const BAR_H = 500;
const GAP = 24;
const [TITLE, STAT, CHART, SPLIT, CTA] = meta.scenes;
const WHIP = 7;
const ZOOM = 16;
const GLITCH = 7;

const p = (f: number, a: number, d: number, e = easeOut) => interpolate(f, [a, a + d], [0, 1], {...clamp, easing: e});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const Role: React.FC<{role: keyof Texts; children: React.ReactNode}> = ({role, children}) => (
  <span data-text-role={role} style={{display: 'contents'}}>{children}</span>
);

// Words rise from line masks, with a small scale and weight settle.
const MaskWords: React.FC<{text: string; f: number; at: number; size: number; color: string; accent: string; weight?: number}> = ({text, f, at, size, color, accent, weight = 900}) => {
  const words = text.trim().split(/\s+/);
  return (
    <div style={{fontSize: size, lineHeight: 1.04, fontWeight: weight, fontFamily: DISPLAY}}>
      {words.map((w, i) => {
        const t = p(f, at + i * 5, 12);
        return (
          <React.Fragment key={i}>
            {i ? ' ' : ''}
            <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: size * 1.08}}>
              <span style={{display: 'inline-block', color: i === words.length - 1 && words.length > 1 ? accent : color, transform: `translateY(${(1 - t) * 110}%) scale(${lerp(1.18, 1, t)})`, transformOrigin: '0 100%', fontVariationSettings: `"wght" ${lerp(500, weight, t)}`}}>{w}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Title: React.FC<SceneP> = ({f, texts, theme}) => {
  const sub = p(f, 28, 12);
  return (
    <AbsoluteFill style={{background: theme.background, padding: PAD, justifyContent: 'center', gap: 34}}>
      <div style={{fontFamily: MONO_FONT, fontSize: 28, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', opacity: p(f, 0, 8)}}>
        <Role role="brand">{texts.brand}</Role>
      </div>
      <Role role="headline">
        <MaskWords text={texts.headline} f={f} at={4} size={wrapFit(texts.headline, 150, CW, 2, 0.6, 64)} color={theme.foreground} accent={theme.accent2} />
      </Role>
      <div style={{fontSize: wrapFit(texts.subhead, 40, CW, 2, 0.52, 26), fontWeight: 500, width: CW, lineHeight: 1.25, color: `${theme.foreground}b3`, opacity: sub, transform: `translateY(${(1 - sub) * 24}px)`}}>
        <Role role="subhead">{texts.subhead}</Role>
      </div>
    </AbsoluteFill>
  );
};

// Crash zoom on the stat, with short speed lines while it moves.
const Stat: React.FC<SceneP> = ({f, texts, theme}) => {
  const t = p(f, 2, 14);
  return (
    <AbsoluteFill style={{background: theme.accent, justifyContent: 'center', alignItems: 'center', color: theme.background}}>
      {t < 0.95 && Array.from({length: 18}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 540, top: 540, width: lerp(420, 40, t), height: 7, background: theme.background, opacity: 0.45 * (1 - t), transformOrigin: '0 50%', transform: `rotate(${(i / 18) * Math.PI * 2}rad) translateX(${lerp(180, 520, t)}px)`}} />
      ))}
      <div style={{textAlign: 'center', transform: `scale(${lerp(2.5, 1, t)})`}}>
        <div style={{fontSize: fit(texts.stat, 300, CW, 0.62), lineHeight: 0.9, fontWeight: 900, fontFamily: DISPLAY}}><Role role="stat">{texts.stat}</Role></div>
        <div style={{fontSize: 54, marginTop: 30, fontWeight: 800}}><Role role="point3">{texts.point3}</Role></div>
      </div>
    </AbsoluteFill>
  );
};

function chartLayout(texts: Texts) {
  const points = parseChart(texts.chart);
  const n = Math.max(1, points.length);
  const bw = (CW - GAP * (n - 1)) / n;
  const max = Math.max(1, ...points.map((pt) => Math.abs(pt.value)));
  const peak = Math.max(0, points.findIndex((pt) => Math.abs(pt.value) === max));
  return {points, bw, max, peak, left: (i: number) => PAD + i * (bw + GAP)};
}

const countText = (display: string, t: number) => {
  if (t > 0.97) return display;
  const m = display.match(/^(-?\d+(?:\.(\d+))?)(.*)$/);
  return m ? `${(parseFloat(m[1]) * t).toFixed(m[2]?.length ?? 0)}${m[3]}` : display;
};

// Bars grow from the baseline and their values count with them.
const Chart: React.FC<SceneP> = ({f, texts, theme}) => {
  const {points, bw, max, peak, left} = chartLayout(texts);
  const valueSize = Math.min(42, ...points.map((pt) => fit(pt.display, 42, bw - 8, 0.62)));
  const labelSize = Math.min(34, ...points.map((pt) => fit(pt.label, 34, bw - 8, 0.58)));
  return (
    <AbsoluteFill style={{background: theme.background, padding: PAD}}>
      <div style={{fontSize: wrapFit(texts.attribution, 70, CW, 2, 0.56, 36), fontWeight: 900, lineHeight: 1.05, color: theme.foreground}}>
        <Role role="attribution">{texts.attribution}</Role>
      </div>
      <div style={{position: 'absolute', left: PAD, right: PAD, top: BASE, height: 6, background: theme.foreground}} />
      <div data-text-role="chart" style={{position: 'absolute', left: PAD, top: BASE - BAR_H - 70, width: CW, height: BAR_H + 150}}>
        {points.map((pt, i) => {
          const t = p(f, 10 + i * 4, 22);
          const h = (Math.abs(pt.value) / max) * BAR_H * t;
          return (
            <div key={i} style={{position: 'absolute', left: left(i) - PAD, top: 0, width: bw, height: BAR_H + 150, color: theme.foreground}}>
              <div style={{position: 'absolute', left: 0, right: 0, bottom: 80, height: h, background: i === peak ? theme.accent2 : `${theme.foreground}33`}} />
              <div style={{position: 'absolute', left: 0, right: 0, bottom: h + 96, textAlign: 'center', fontFamily: MONO_FONT, fontSize: valueSize, fontWeight: 800}}>{countText(pt.display, t)}</div>
              <div style={{position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', fontSize: labelSize, fontWeight: 700, whiteSpace: 'nowrap'}}>{pt.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Pane: React.FC<{role: 'point1' | 'point2'; label: string; text: string; side: 'l' | 'r'; reveal: number; theme: Theme}> = ({role, label, text, side, reveal, theme}) => {
  const dark = side === 'r';
  return (
    <div style={{position: 'absolute', top: 0, bottom: 0, width: W / 2, left: side === 'l' ? 0 : W / 2, background: dark ? theme.foreground : theme.surface, color: dark ? theme.background : theme.foreground, clipPath: side === 'l' ? `inset(0 0 0 ${(1 - reveal) * 100}%)` : `inset(0 ${(1 - reveal) * 100}% 0 0)`, padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24}}>
      <div style={{fontFamily: MONO_FONT, fontSize: 26, fontWeight: 700, color: dark ? theme.accent : `${theme.foreground}99`}}>{label}</div>
      <div style={{fontSize: wrapFit(text, 70, W / 2 - 128, 2, 0.58, 36), lineHeight: 1, fontWeight: 900}}><Role role={role}>{text}</Role></div>
    </div>
  );
};

// Two states side by side, with a glass caption over a busy band.
const Split: React.FC<SceneP> = ({f, texts, theme}) => {
  const reveal = p(f, 5, 14);
  const cap = p(f, 22, 12);
  return (
    <AbsoluteFill style={{background: theme.background}}>
      <Pane side="l" role="point1" label="BEFORE" text={texts.point1} reveal={reveal} theme={theme} />
      <Pane side="r" role="point2" label="NOW" text={texts.point2} reveal={reveal} theme={theme} />
      <div style={{position: 'absolute', left: 538, top: 0, bottom: 0, width: 4, background: theme.accent, transform: `scaleY(${p(f, 0, 8)})`}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 250, backgroundImage: `repeating-linear-gradient(90deg, ${theme.accent2}66 0 18px, transparent 18px 46px)`}} />
      <GlassCaption tint={theme.background} border={`${theme.background}a6`} style={{position: 'absolute', left: 140, right: 140, bottom: 82, padding: '26px 34px', fontSize: fit(texts.date, 38, 732, 0.56), fontWeight: 800, textAlign: 'center', color: theme.foreground, opacity: cap, transform: `translateY(${(1 - cap) * 24}px)`}}>
        <Role role="date">{texts.date}</Role>
      </GlassCaption>
    </AbsoluteFill>
  );
};

// Pull-back reveal: the end card starts cropped close and settles in one eased move.
const Cta: React.FC<SceneP> = ({f, texts, theme}) => {
  const t = p(f, 0, 40, easeInOut);
  return (
    <AbsoluteFill style={{background: theme.foreground, color: theme.background, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: `scale(${lerp(3.1, 1, t)})`, transformOrigin: '50% 38%', textAlign: 'center'}}>
        <div style={{fontSize: fit(texts.brand, 140, CW, 0.62), fontWeight: 900, lineHeight: 1, fontFamily: DISPLAY}}><Role role="brand">{texts.brand}</Role></div>
        <div style={{marginTop: 38, padding: '24px 46px', borderRadius: 8, background: theme.accent, fontSize: fit(texts.cta, 42, 620, 0.56), fontWeight: 800, display: 'inline-block'}}><Role role="cta">{texts.cta}</Role></div>
      </div>
    </AbsoluteFill>
  );
};

const SCENES = [Title, Stat, Chart, Split, Cta];

// Glitch cut: seeded horizontal slices with brief theme-color offsets, only at the cut.
const Glitch: React.FC<{f: number; theme: Theme; children: React.ReactNode}> = ({f, theme, children}) => {
  const step = Math.floor(f / 2);
  return (
    <AbsoluteFill>
      {Array.from({length: 9}, (_, i) => {
        const top = (i / 9) * 100;
        const dx = (random(`launchcut-${step}-${i}`) - 0.5) * 180;
        return (
          <AbsoluteFill key={i} data-text-copy="" style={{clipPath: `inset(${top}% 0 ${100 - top - 100 / 9}% 0)`, transform: `translateX(${dx}px)`}}>
            {children}
            <AbsoluteFill style={{background: i % 2 ? theme.accent : theme.accent2, opacity: 0.22, transform: `translateX(${dx * 0.18}px)`}} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

export const Launchcut: React.FC<LaunchcutProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const index = meta.scenes.reduce((last, s, i) => (frame >= s.from ? i : last), 0);
  const render = (i: number, f: number) => {
    const Scene = SCENES[i];
    return <Scene f={f} texts={texts} theme={theme} />;
  };
  const base = render(index, frame - meta.scenes[index].from);
  let body = base;

  if (frame >= STAT.from - WHIP && frame < STAT.from + WHIP) {
    body = <WhipPan progress={(frame - (STAT.from - WHIP)) / (WHIP * 2)} width={W} from={render(0, TITLE.duration - 1)} to={render(1, WHIP * 2)} />;
  } else if (frame >= SPLIT.from - ZOOM && frame < SPLIT.from) {
    // Zoom-through the peak bar: its color fills the frame, then the split cuts in.
    const {points, bw, max, peak, left} = chartLayout(texts);
    const h = points.length ? (Math.abs(points[peak].value) / max) * BAR_H : 0;
    const t = p(frame, SPLIT.from - ZOOM, ZOOM, easeIn);
    body = (
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <AbsoluteFill style={{transform: `scale(${lerp(1, 12, t)})`, transformOrigin: `${((left(peak) + bw / 2) / W) * 100}% ${((BASE - h / 2) / W) * 100}%`}}>{base}</AbsoluteFill>
        <AbsoluteFill style={{background: theme.accent2, opacity: p(frame, SPLIT.from - 7, 7)}} />
      </AbsoluteFill>
    );
  } else if (frame >= SPLIT.from && frame < SPLIT.from + GLITCH) {
    body = <Glitch f={frame} theme={theme}>{base}</Glitch>;
  }

  return <AbsoluteFill style={{background: theme.background, color: theme.foreground, fontFamily: SANS_FONT, overflow: 'hidden'}}>{body}</AbsoluteFill>;
};
