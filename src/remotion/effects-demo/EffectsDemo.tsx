import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {clamp, easeIn, easeInOut, easeOut} from '../../videos/shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../../videos/shared/fonts';
import {GlassCaption, WhipPan} from '../../videos/effects/effects';

loadTemplateFonts();

type Mode = 'before' | 'after';
const C = {bg: '#f4f1ea', surface: '#ffffff', fg: '#16181d', accent: '#ff5a36', accent2: '#2f6bff'};
const W = 1080;
const PAD = 90;
const BARS = [{l: 'Q1', v: 18}, {l: 'Q2', v: 27}, {l: 'Q3', v: 41}, {l: 'Q4', v: 64}];
const p = (f: number, a: number, d: number, e = easeOut) => interpolate(f, [a, a + d], [0, 1], {...clamp, easing: e});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Scene windows. Both versions use the same story and timing.
const S = {title: [0, 64], stat: [64, 130], chart: [130, 202], split: [202, 252], cta: [252, 300]} as const;
const inScene = (f: number, [a, b]: readonly [number, number]) => f >= a && f < b;

const Fade: React.FC<{f: number; at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({f, at, children, style}) => (
  <div style={{opacity: p(f, at, 12), transform: `translateY(${(1 - p(f, at, 12)) * 24}px)`, ...style}}>{children}</div>
);

const MaskWords: React.FC<{text: string; f: number; at: number; size: number; weight?: number; color?: string}> = ({text, f, at, size, weight = 900, color = C.fg}) => (
  <div style={{fontSize: size, lineHeight: 1, fontWeight: weight, color}}>
    {text.split(' ').map((w, i) => {
      const t = p(f, at + i * 5, 12);
      return (
        <React.Fragment key={i}>
          {i ? ' ' : ''}
          <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: size * 1.06}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - t) * 110}%) scale(${lerp(1.18, 1, t)})`, transformOrigin: '0 100%', fontVariationSettings: `"wght" ${lerp(500, weight, t)}`}}>{w}</span>
          </span>
        </React.Fragment>
      );
    })}
  </div>
);

const Title: React.FC<{f: number; mode: Mode}> = ({f, mode}) => (
  <AbsoluteFill style={{padding: PAD, justifyContent: 'center', gap: 34}}>
    <div style={{fontFamily: MONO_FONT, fontSize: 28, fontWeight: 700, color: C.accent}}>PULSE / RELEASE 4.0</div>
    {mode === 'after' ? (
      <>
        <MaskWords text="Reports," f={f} at={4} size={150} />
        <MaskWords text="rebuilt." f={f} at={13} size={150} color={C.accent2} />
      </>
    ) : (
      <Fade f={f} at={4}><div style={{fontSize: 150, lineHeight: 1, fontWeight: 900}}>Reports,<br /><span style={{color: C.accent2}}>rebuilt.</span></div></Fade>
    )}
    <Fade f={f} at={28}><div style={{fontSize: 40, fontWeight: 500, width: 780, lineHeight: 1.25, color: '#4b4f58'}}>Live dashboards that load before you finish asking.</div></Fade>
  </AbsoluteFill>
);

const Stat: React.FC<{f: number; mode: Mode}> = ({f, mode}) => {
  const t = p(f, 2, 14);
  const scale = mode === 'after' ? lerp(2.5, 1, t) : 1;
  return (
    <AbsoluteFill style={{background: C.accent, justifyContent: 'center', alignItems: 'center', color: C.bg}}>
      {mode === 'after' && t < 0.95 && Array.from({length: 18}, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const len = lerp(420, 40, t);
        return <div key={i} style={{position: 'absolute', left: 540, top: 540, width: len, height: 7, background: C.bg, opacity: 0.45 * (1 - t), transformOrigin: '0 50%', transform: `rotate(${a}rad) translateX(${lerp(180, 520, t)}px)`}} />;
      })}
      <div style={{textAlign: 'center', opacity: mode === 'before' ? p(f, 2, 14) : 1, transform: `scale(${scale})`}}>
        <div style={{fontSize: 300, lineHeight: 0.9, fontWeight: 900, fontFamily: DISPLAY}}>3.2x</div>
        <div style={{fontSize: 54, marginTop: 30, fontWeight: 800}}>faster reports</div>
      </div>
    </AbsoluteFill>
  );
};

const Chart: React.FC<{f: number; mode: Mode}> = ({f, mode}) => {
  const base = 820;
  const bw = 180;
  const gap = (W - PAD * 2 - bw * 4) / 3;
  return (
    <AbsoluteFill style={{background: C.bg, padding: PAD}}>
      <div style={{fontSize: 70, fontWeight: 900, lineHeight: 1}}>Weekly active teams</div>
      <div style={{position: 'absolute', left: PAD, right: PAD, top: base, height: 6, background: C.fg}} />
      {BARS.map((b, i) => {
        const t = mode === 'after' ? p(f, 10 + i * 6, 24) : p(f, 8, 12);
        const h = (b.v / 64) * 500 * (mode === 'after' ? t : 1);
        const value = mode === 'after' ? Math.round(b.v * t) : b.v;
        return (
          <div key={b.l} style={{position: 'absolute', left: PAD + i * (bw + gap), top: base - 560, width: bw, height: 560, opacity: mode === 'before' ? t : 1}}>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: i === 3 ? C.accent2 : '#c9cdd6'}} />
            <div style={{position: 'absolute', left: 0, right: 0, bottom: h + 16, textAlign: 'center', fontFamily: MONO_FONT, fontSize: 42, fontWeight: 800}}>{value}k</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 590, textAlign: 'center', fontSize: 34, fontWeight: 700}}>{b.l}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Pane: React.FC<{label: string; title: string; dark?: boolean; reveal: number; side: 'l' | 'r'}> = ({label, title, dark, reveal, side}) => (
  <div style={{position: 'absolute', top: 0, bottom: 0, width: W / 2, left: side === 'l' ? 0 : W / 2, background: dark ? C.fg : '#dedbd3', color: dark ? C.bg : C.fg, clipPath: side === 'l' ? `inset(0 0 0 ${(1 - reveal) * 100}%)` : `inset(0 ${(1 - reveal) * 100}% 0 0)`, padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24}}>
    <div style={{fontFamily: MONO_FONT, fontSize: 26, fontWeight: 700, color: dark ? C.accent : '#6c6f77'}}>{label}</div>
    <div style={{fontSize: 70, lineHeight: 1, fontWeight: 900}}>{title}</div>
  </div>
);

const Split: React.FC<{f: number; mode: Mode}> = ({f, mode}) => {
  const reveal = mode === 'after' ? p(f, 5, 14) : 1;
  const cap = p(f, 22, 12);
  return (
    <AbsoluteFill style={{opacity: mode === 'before' ? p(f, 0, 12) : 1}}>
      <Pane side="l" label="BEFORE" title="Nightly exports" reveal={reveal} />
      <Pane side="r" label="NOW" title="Live in seconds" dark reveal={reveal} />
      <div style={{position: 'absolute', left: 538, top: 0, bottom: 0, width: 4, background: C.accent, transform: `scaleY(${mode === 'after' ? p(f, 0, 8) : 1})`}} />
      {/* Busy pattern behind the caption shows what the glass treatment is for. */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 250, backgroundImage: `repeating-linear-gradient(90deg, ${C.accent2}66 0 18px, transparent 18px 46px)`}} />
      {mode === 'after' ? (
        <GlassCaption tint={C.surface} border={`${C.surface}a6`} style={{position: 'absolute', left: 140, right: 140, bottom: 82, padding: '26px 34px', fontSize: 38, fontWeight: 800, textAlign: 'center', color: C.fg, opacity: cap, transform: `translateY(${(1 - cap) * 24}px)`}}>
          Now in every workspace
        </GlassCaption>
      ) : (
        <div style={{position: 'absolute', left: 140, right: 140, bottom: 82, padding: '26px 34px', borderRadius: 8, fontSize: 38, fontWeight: 800, textAlign: 'center', background: C.surface, color: C.fg, opacity: cap, transform: `translateY(${(1 - cap) * 24}px)`}}>Now in every workspace</div>
      )}
    </AbsoluteFill>
  );
};

const Cta: React.FC<{f: number; mode: Mode}> = ({f, mode}) => {
  const t = p(f, 0, 40, easeInOut);
  const scale = mode === 'after' ? lerp(3.1, 1, t) : 1;
  return (
    <AbsoluteFill style={{background: C.fg, color: C.bg, justifyContent: 'center', alignItems: 'center', opacity: mode === 'before' ? p(f, 0, 12) : 1}}>
      <div style={{transform: `scale(${scale})`, transformOrigin: '50% 38%', textAlign: 'center'}}>
        <div style={{fontSize: 140, fontWeight: 900, lineHeight: 1}}>Pulse</div>
        <div style={{marginTop: 38, padding: '24px 46px', borderRadius: 8, background: C.accent, fontSize: 42, fontWeight: 800, display: 'inline-block'}}>Try it free</div>
      </div>
    </AbsoluteFill>
  );
};

const scene = (f: number, mode: Mode, key: keyof typeof S) => {
  const local = f - S[key][0];
  const props = {f: local, mode};
  if (key === 'title') return <Title {...props} />;
  if (key === 'stat') return <Stat {...props} />;
  if (key === 'chart') return <Chart {...props} />;
  if (key === 'split') return <Split {...props} />;
  return <Cta {...props} />;
};

// Glitch cut: seeded horizontal slices with brief theme-color offsets, only around the cut.
const Glitch: React.FC<{f: number; children: React.ReactNode}> = ({f, children}) => {
  const step = Math.floor(f / 2);
  return (
    <AbsoluteFill>
      {Array.from({length: 9}, (_, i) => {
        const top = (i / 9) * 100;
        const dx = (random(`g-${step}-${i}`) - 0.5) * 180;
        return (
          <AbsoluteFill key={i} style={{clipPath: `inset(${top}% 0 ${100 - top - 100 / 9}% 0)`, transform: `translateX(${dx}px)`}}>
            {children}
            <AbsoluteFill style={{background: i % 2 ? C.accent : C.accent2, opacity: 0.22, transform: `translateX(${dx * 0.18}px)`}} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

export const EffectsDemo: React.FC<{mode: Mode}> = ({mode}) => {
  const f = useCurrentFrame();
  const key = (Object.keys(S) as (keyof typeof S)[]).find((k) => inScene(f, S[k])) ?? 'cta';
  const base = <AbsoluteFill style={{background: C.bg, color: C.fg, fontFamily: SANS_FONT, overflow: 'hidden'}}>{scene(f, mode, key)}</AbsoluteFill>;

  let body = base;
  if (mode === 'after') {
    // Whip pan from the title into the stat.
    if (f >= S.stat[0] - 7 && f < S.stat[0] + 7) {
      body = (
        <AbsoluteFill style={{overflow: 'hidden', fontFamily: SANS_FONT, color: C.fg}}>
          <WhipPan
            progress={(f - (S.stat[0] - 7)) / 14}
            width={W}
            from={<AbsoluteFill style={{background: C.bg}}>{scene(S.stat[0] - 1, mode, 'title')}</AbsoluteFill>}
            to={scene(S.stat[0] + 14, mode, 'stat')}
          />
        </AbsoluteFill>
      );
    }
    // Zoom-through the peak bar: its color becomes the frame, then hands off to the split.
    if (f >= S.chart[1] - 16 && f < S.chart[1]) {
      const t = p(f, S.chart[1] - 16, 16, easeIn);
      body = (
        <AbsoluteFill style={{overflow: 'hidden'}}>
          <AbsoluteFill style={{transform: `scale(${lerp(1, 7, t)})`, transformOrigin: '86% 58%'}}>{base}</AbsoluteFill>
          <AbsoluteFill style={{background: C.accent2, opacity: p(f, S.chart[1] - 7, 7)}} />
        </AbsoluteFill>
      );
    }
    if (f >= S.split[0] && f < S.split[0] + 7) body = <Glitch f={f}>{base}</Glitch>;
  }

  return <AbsoluteFill style={{background: C.bg}}>{body}</AbsoluteFill>;
};
