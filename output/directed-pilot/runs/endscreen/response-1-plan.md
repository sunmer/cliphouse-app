CONCEPT: The video's progress bar reaches 100%, splits, and lifts up to become the end-screen frames and the subscribe ring. Its countdown then drains back to the empty bar that opens the piece.

BEATS:
0–15: the empty track and playhead sit at the bottom margin. The red fill takes its first eased step.
15–30: "Thanks" rises out of its mask line, the next words follow, and the fill steps again.
30–45: the last headline word lands and the fill steps.
45–60: subhead words rise out of their masks and the fill steps.
60–75: the headline and subhead read fully. The fill steps and the timecode keeps ticking.
75–90: the fill takes its last step to 100%.
90–105: the playhead pops at the end of the bar. The headline and subhead exit upward through their masks.
105–120: the full red bar splits into three segments as gaps open at the slot boundaries.
120–135: the segments shoot up and become the top edges of the two frames and the tangent of the circle.
135–150: the frames unroll down from their red edges. The third segment folds into the subscribe ring, which draws both ways from the top, and the disk fills. All placeholders are locked from 150.
150–165: the label "01 / point1" rises from its mask. An accent2 countdown fills the track toward the playhead and the orbit arc grows in.
165–180: "02 / point2" rises and the CTA pill wipes in from the left.
180–195: CTA words rise and the brand rises character by character.
195–420: the hold. On every beat the orbit arc steps 45° and the in-frame scrub strips step. The countdown drains continuously and the timecode runs.
420–435: the strongest moment begins. Accent floods the subscribe circle from its center.
435–450: an accent wipe fills the CTA pill left to right.
450–465: a plus stamps into the circle with one small overshoot.
465–600: the end screen holds still. The orbit and strips keep stepping on the beat and the countdown drains to the empty bar and left playhead of frame 0.

FILE: meta.ts
```ts
import type {TemplateMeta} from '../vocab.ts';

export const endscreenMeta: TemplateMeta = {
  id: 'endscreen',
  name: 'End Screen',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 600,
  posterFrame: 480,
  motion: ['Progress bar', 'Line draw', 'Mask reveal', 'Wipes', 'Orbit'],
  scenes: [
    {type: 'tagline', from: 0, duration: 105, focus: 66, roles: ['headline', 'subhead']},
    {type: 'end-screen', from: 105, duration: 495, focus: 95, roles: ['brand', 'point1', 'point2', 'cta']},
  ],
};
```
FILE: Endscreen.tsx
```tsx
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Role} from '../contract';
import {clamp, easeIn, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {endscreenMeta} from './meta';
import type {EndscreenProps} from './schema';

loadTemplateFonts();

const {width: W, height: H, durationInFrames: D} = endscreenMeta;
const E = endscreenMeta.scenes[1].from; // end-screen scene start; every handoff is timed from here
const BEAT = 15;
const M = 120;
const TRACK_X0 = M;
const TRACK_X1 = W - M;
const TRACK_L = TRACK_X1 - TRACK_X0;
const TRACK_Y = 957;
const TRACK_H = 6;
const FRAME_Y = 330;
const FRAME_W = 600;
const FRAME_H = 338;
const SLOT_X = [120, 780];
const CX = 1620;
const CY = FRAME_Y + FRAME_H / 2;
const R_OUT = 160;
const R_RING = 157;
const R_ORBIT = 180;
const LABEL_Y = FRAME_Y + FRAME_H + 34;

const expo = Easing.out(Easing.exp);
const prog = (f: number, a: number, b: number, easing: (t: number) => number = expo) =>
  interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pad = (n: number) => String(n).padStart(2, '0');

// Stepped beat counter: advances by one on every beat with a fast eased step.
const beatSteps = (frame: number, start: number) => {
  const t = frame - start;
  if (t < 0) return 0;
  const k = Math.floor(t / BEAT);
  return k + interpolate(t - k * BEAT, [0, 9], [0, 1], {...clamp, easing: easeOut});
};

const SEGS = [
  {from: [120, 750], to: [SLOT_X[0], SLOT_X[0] + FRAME_W], y: FRAME_Y},
  {from: [750, 1410], to: [SLOT_X[1], SLOT_X[1] + FRAME_W], y: FRAME_Y},
  {from: [1410, 1800], to: [1440, 1800], y: CY - R_OUT},
] as const;

const Words: React.FC<{
  text: string;
  role: Role;
  frame: number;
  start: number;
  stagger: number;
  dur?: number;
  exit?: number;
  exitStagger?: number;
  justify?: React.CSSProperties['justifyContent'];
  style?: React.CSSProperties;
}> = ({text, role, frame, start, stagger, dur = 14, exit, exitStagger = 2, justify = 'flex-start', style}) => {
  const words = text.trim().split(/\s+/);
  return (
    <span data-text-role={role} style={{display: 'flex', flexWrap: 'wrap', justifyContent: justify, columnGap: '0.26em', ...style}}>
      {words.map((w, i) => {
        const t = prog(frame, start + i * stagger, start + i * stagger + dur);
        const o = exit === undefined ? 0 : prog(frame, exit + i * exitStagger, exit + i * exitStagger + 12, easeIn);
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em'}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - t) * 115 - o * 115}%)`}}>
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          </span>
        );
      })}
    </span>
  );
};

const PlayGlyph: React.FC<{color: string}> = ({color}) => (
  <svg width={64} height={64} viewBox="0 0 64 64">
    <path d="M22 14 L52 32 L22 50 Z" fill={color} />
  </svg>
);

export const Endscreen: React.FC<EndscreenProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fg = theme.foreground;

  // Scene 1: the progress bar fills in eased steps, one per beat.
  let fill = 0;
  for (let i = 0; i < 6; i++) fill += prog(frame, i * BEAT, i * BEAT + 12) / 6;

  // End screen countdown: wipes in toward the playhead, then drains back to the frame-0 state.
  const cdIn = prog(frame, E + 45, E + 60);
  const drain = interpolate(frame, [E + 60, D], [1, 0], clamp);
  const dotX = frame < E ? TRACK_X0 + fill * TRACK_L : TRACK_X0 + drain * TRACK_L;
  const dotPop = interpolate(frame, [88, 92, 106], [1, 1.6, 1], {...clamp, easing: easeOut});

  // Handoff: the full bar splits, rises, and becomes frames + ring.
  const split = prog(frame, E, E + 13, easeInOut);
  const rise = prog(frame, E + 13, E + 27);
  const shrink = prog(frame, E + 25, E + 37, easeInOut);
  const unroll = prog(frame, E + 25, E + 41);
  const draw = prog(frame, E + 25, E + 43, easeOut);
  const disk = spring({frame: frame - (E + 31), fps, config: {damping: 200}});
  const orbitGrow = prog(frame, E + 45, E + 57);
  const orbitAngle = -110 + 45 * beatSteps(frame, E + 45);
  const pillIn = prog(frame, E + 62, E + 74, easeOut);

  // Strongest moment, last third.
  const flood = prog(frame, E + 315, E + 325);
  const pillFill = prog(frame, E + 330, E + 341);
  const plus = spring({frame: frame - (E + 345), fps, config: {damping: 30, stiffness: 180}});

  const hs = wrapFit(texts.headline, 168, 1680, 2, 0.62, 60);
  const ss = fit(texts.subhead, 48, 1680, 0.56);
  const bs = fit(texts.brand, 56, 1000, 0.7);
  const cs = wrapFit(texts.cta, 40, 300, 2, 0.62, 22);
  const hWords = texts.headline.trim().split(/\s+/).length;
  const sWords = texts.subhead.trim().split(/\s+/).length;
  const brandChars = [...texts.brand];
  const brandStagger = Math.min(1.5, 20 / Math.max(1, brandChars.length));

  const rem = D - frame;
  const timecode = `00:${pad(Math.floor(rem / fps))}:${pad(rem % fps)}`;
  const C = 2 * Math.PI * R_ORBIT;

  const strip = (offset: number) => {
    const c = (beatSteps(frame, E + 45) + offset) % 16;
    const s0 = Math.min(1, Math.max(0, (c - 8) / 8));
    const s1 = Math.min(1, Math.max(0, c / 8));
    return {s0, s1};
  };

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: theme.background, fontFamily: DISPLAY}}>
      {/* Timecode chrome */}
      <div
        style={{
          position: 'absolute',
          right: M,
          top: 136,
          fontFamily: MONO_FONT,
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
          color: `${fg}8c`,
        }}
      >
        {timecode}
      </div>

      {/* Scene 1 copy */}
      {frame < E + 30 && (
        <div style={{position: 'absolute', left: M, top: FRAME_Y - 20, width: W - 2 * M, display: 'flex', flexDirection: 'column'}}>
          <Words
            text={texts.headline}
            role="headline"
            frame={frame}
            start={8}
            stagger={Math.min(7, 28 / hWords)}
            dur={16}
            exit={E - 9}
            exitStagger={2}
            style={{fontSize: hs, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: fg}}
          />
          <div style={{marginTop: 44}}>
            <Words
              text={texts.subhead}
              role="subhead"
              frame={frame}
              start={36}
              stagger={Math.min(3, 18 / sWords)}
              exit={E - 5}
              exitStagger={Math.min(1.5, 6 / sWords)}
              style={{fontSize: ss, fontWeight: 500, lineHeight: 1.15, color: `${fg}bf`}}
            />
          </div>
        </div>
      )}

      {/* Placeholder frames, unrolled from their red top edges */}
      {SLOT_X.map((x, i) => {
        const {s0, s1} = strip(i * 4);
        return unroll > 0 ? (
          <div key={i} style={{position: 'absolute', left: x, top: FRAME_Y, width: FRAME_W, height: FRAME_H * unroll, overflow: 'hidden', background: theme.surface}}>
            <div style={{position: 'absolute', left: 28, top: 30, fontFamily: MONO_FONT, fontSize: 22, fontWeight: 600, color: theme.accent2}}>{pad(i + 1)}</div>
            <div style={{position: 'absolute', left: FRAME_W / 2 - 32, top: FRAME_H / 2 - 32}}>
              <PlayGlyph color={`${fg}33`} />
            </div>
            <div style={{position: 'absolute', left: 28, right: 28, top: FRAME_H - 32, height: 4, background: `${fg}1f`}}>
              <div style={{position: 'absolute', top: 0, bottom: 0, left: `${s0 * 100}%`, width: `${(s1 - s0) * 100}%`, background: theme.accent2}} />
            </div>
          </div>
        ) : null;
      })}

      {/* Subscribe ring, orbit and flood */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {disk > 0.001 && <circle cx={CX} cy={CY} r={154 * disk} fill={theme.surface} />}
        {flood > 0 && <circle cx={CX} cy={CY} r={154 * flood} fill={theme.accent} />}
        {draw > 0 && (
          <>
            <path
              d={`M ${CX} ${CY - R_RING} A ${R_RING} ${R_RING} 0 0 0 ${CX} ${CY + R_RING}`}
              fill="none"
              stroke={theme.accent}
              strokeWidth={6}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
            />
            <path
              d={`M ${CX} ${CY - R_RING} A ${R_RING} ${R_RING} 0 0 1 ${CX} ${CY + R_RING}`}
              fill="none"
              stroke={theme.accent}
              strokeWidth={6}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
            />
          </>
        )}
        {orbitGrow > 0 && (
          <circle
            cx={CX}
            cy={CY}
            r={R_ORBIT}
            fill="none"
            stroke={theme.accent2}
            strokeWidth={4}
            strokeDasharray={`${C * (40 / 360) * orbitGrow} ${C}`}
            transform={`rotate(${orbitAngle} ${CX} ${CY})`}
          />
        )}
        {plus > 0.001 && (
          <g transform={`translate(${CX} ${CY}) scale(${plus})`}>
            <rect x={-46} y={-8} width={92} height={16} fill={fg} />
            <rect x={-8} y={-46} width={16} height={92} fill={fg} />
          </g>
        )}
      </svg>

      {/* Track, fills, playhead */}
      <div style={{position: 'absolute', left: TRACK_X0, top: TRACK_Y, width: TRACK_L, height: TRACK_H, background: `${fg}2e`}} />
      {frame >= E + 45 && (
        <div style={{position: 'absolute', left: TRACK_X0, top: TRACK_Y, width: TRACK_L * Math.min(cdIn, drain), height: TRACK_H, background: theme.accent2}} />
      )}
      {frame < E && <div style={{position: 'absolute', left: TRACK_X0, top: TRACK_Y, width: TRACK_L * fill, height: TRACK_H, background: theme.accent}} />}
      {frame >= E &&
        SEGS.map((s, i) => {
          let a = lerp(s.from[0], s.to[0], split);
          let b = lerp(s.from[1], s.to[1], split);
          if (i === 2) {
            a = lerp(a, CX, shrink);
            b = lerp(b, CX, shrink);
          }
          if (b - a < 0.5) return null;
          return <div key={i} style={{position: 'absolute', left: a, top: lerp(TRACK_Y, s.y, rise), width: b - a, height: TRACK_H, background: theme.accent}} />;
        })}
      <div
        style={{
          position: 'absolute',
          left: dotX - 10,
          top: TRACK_Y + TRACK_H / 2 - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: fg,
          transform: `scale(${dotPop})`,
        }}
      />

      {/* Labels under the frames */}
      {(['point1', 'point2'] as const).map((role, i) => {
        const start = E + 36 + i * BEAT;
        const idx = prog(frame, start, start + 14);
        return (
          <div key={role} style={{position: 'absolute', left: SLOT_X[i], top: LABEL_Y, width: FRAME_W, display: 'flex', alignItems: 'baseline', gap: 20}}>
            <span style={{display: 'inline-block', overflow: 'hidden', fontFamily: MONO_FONT, fontSize: 24, fontWeight: 600, color: theme.accent2}}>
              <span style={{display: 'inline-block', transform: `translateY(${(1 - idx) * 115}%)`}}>{pad(i + 1)}</span>
            </span>
            <Words
              text={texts[role]}
              role={role}
              frame={frame}
              start={start + 3}
              stagger={3}
              style={{fontSize: fit(texts[role], 44, 520, 0.62), fontWeight: 800, lineHeight: 1.05, color: fg, whiteSpace: 'nowrap'}}
            />
          </div>
        );
      })}

      {/* Call to action pill */}
      <div style={{position: 'absolute', left: 1440, top: LABEL_Y - 6, width: 360, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative', padding: '16px 28px', clipPath: `inset(0 ${(1 - pillIn) * 100}% 0 0)`}}>
          <div style={{position: 'absolute', inset: 0, border: `3px solid ${fg}59`}} />
          <div style={{position: 'absolute', inset: 0, background: theme.accent, clipPath: `inset(0 ${(1 - pillFill) * 100}% 0 0)`}} />
          <div style={{position: 'relative', maxWidth: 304}}>
            <Words
              text={texts.cta}
              role="cta"
              frame={frame}
              start={E + 68}
              stagger={3}
              justify="center"
              style={{fontSize: cs, fontWeight: 800, lineHeight: 1.1, color: fg, textAlign: 'center'}}
            />
          </div>
        </div>
      </div>

      {/* Brand */}
      <div style={{position: 'absolute', left: M, top: M, overflow: 'hidden', paddingBottom: '0.12em'}}>
        <span data-text-role="brand" style={{display: 'flex', whiteSpace: 'pre', fontSize: bs, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.01em', color: fg}}>
          {brandChars.map((ch, i) => {
            const t = prog(frame, E + 81 + i * brandStagger, E + 81 + i * brandStagger + 14);
            return (
              <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - t) * 120}%)`}}>
                {ch}
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};
```