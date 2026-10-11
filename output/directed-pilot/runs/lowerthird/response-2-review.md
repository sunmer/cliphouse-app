CONCEPT: One accent spine builds every strap. It wipes the name plate out of itself, lies down to become the topic rule, folds into the handle tab, then stands back up. Each strap's own edge works as an on-air meter that steps forward on the beat.

**Review of v2**
- **Clutter:** The three-tick ruler under the strap was disconnected chrome. It was tiny and unrelated to any strap, and it was the only thing moving during the holds. It is removed.
- **Empty for too long:** The name strap (30–75), the topic strap (120–165) and the handle (210–255) each sat static for about 45 frames. Each strap now carries a meter on its own edge (the headline row's base, the topic rule itself, the handle plate's base). The meter visibly steps forward on every beat while the text holds.
- **Overlap:** The 1200 px topic rule ran through the footage panel and across the microphone. It is now 880 px. Every strap is sized to finish before the panel edge at x=1040.
- **Hard to read:** The headline at 32 px and the single-line subhead were small for a 1080p frame. The headline is now 38 px, the brand 72 px, the handle 72 px, and the subhead wraps onto two masked lines at up to 56 px.
- **Clumsy morph:** At frame 90 the spine grew in width and height at the same time, so it read as a red blob. Now its height collapses first and the length then shoots out, so it reads as the bar lying down into the rule.
- **Weak peak:** The handle tear-open was soft. It now tears open fast with an exponential ease, and the handle slams up immediately. The handle text stays still and readable for about 40 frames before the strap retracts.

BEATS:
0–14: The accent spine stands alone. The white name plate wipes out of it.
15: Brand characters rise from the plate mask. The headline row wipes out from the spine.
30: Headline words have landed, so the name strap is complete.
45: The meter on the headline row's base steps to one third.
60: The meter steps to two thirds.
75: The meter is full. Both plates retract into the spine.
86–100: The spine collapses flat, then shoots right into an 880 px accent rule.
105: The point1 tag rises out of the rule.
120: Subhead words have risen in on two masked lines.
135: An accent2 meter runs one third along the rule.
150: The meter reaches two thirds.
165: The meter is full. The subhead drops through its mask and the tag sinks into the rule.
180: The rule drains and folds into a 140 px accent block.
195: Strongest moment. The block tears open into the handle plate and the handle characters slam up.
210: The handle meter steps to one third.
225: The tab fills with foreground, the arrow drives in, and the meter reaches two thirds.
240: The meter is full while the handle holds, readable.
252–259: The plate retracts into the block and the tab drains back to accent.
260–269: The block stands back up into the spine, matching frame 0 for the loop.

FILE: meta.ts
```ts
import type {TemplateMeta} from '../vocab.ts';

export const lowerthirdMeta: TemplateMeta = {
  id: 'lowerthird',
  name: 'Lower Thirds',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 270,
  posterFrame: 241,
  motion: ['Lower thirds', 'Mask reveal', 'Wipes', 'Line draw', 'Progress bar'],
  scenes: [
    {type: 'lower-third', from: 0, duration: 90, focus: 40, roles: ['brand', 'headline']},
    {type: 'lower-third', from: 90, duration: 90, focus: 45, roles: ['point1', 'subhead']},
    {type: 'lower-third', from: 180, duration: 90, focus: 60, roles: ['brand', 'cta']},
  ],
};
```

FILE: Lowerthird.tsx
```tsx
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../contract';
import {ArrowIcon, clamp, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {lowerthirdMeta} from './meta';
import type {LowerthirdProps} from './schema';

loadTemplateFonts();

const W = lowerthirdMeta.width;
const H = lowerthirdMeta.height;
const [SC1, SC2, SC3] = lowerthirdMeta.scenes;
const A = SC1.from;
const B = SC2.from;
const C = SC3.from;
const END = lowerthirdMeta.durationInFrames - 1;

// Grid: 120 px left margin. Every strap lives between y=800 and y=960 and ends before x=1040.
const X = 120;
const TOP = 800;
const BASE = 960;
const SPINE_W = 16;
const SPINE_H = BASE - TOP;
const RULE_W = 880;
const RULE_H = 6;
const BLOCK = 140;
const NAME_H = 104;
const METER_H = 6;

const ramp = (f: number, a: number, b: number, ease = easeOut) =>
  interpolate(f, [a, b], [0, 1], {...clamp, easing: ease});
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const MASK: React.CSSProperties = {
  display: 'inline-block',
  overflow: 'hidden',
  verticalAlign: 'top',
  paddingBottom: '0.12em',
  marginBottom: '-0.12em',
};

// Characters rise out of a single mask line.
const Chars: React.FC<{text: string; role: string; frame: number; start: number; stagger: number; dur: number}> = ({
  text,
  role,
  frame,
  start,
  stagger,
  dur,
}) => (
  <span data-text-role={role} style={{...MASK, whiteSpace: 'pre'}}>
    {[...text].map((ch, i) => {
      const p = ramp(frame, start + i * stagger, start + i * stagger + dur);
      return (
        <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`}}>
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      );
    })}
  </span>
);

// Words rise out of their own masks (so wrapping stays natural) and can drop back out.
const Words: React.FC<{
  text: string;
  role: string;
  frame: number;
  start: number;
  stagger: number;
  dur: number;
  out?: number;
}> = ({text, role, frame, start, stagger, dur, out}) => {
  const words = text.trim().split(/\s+/);
  return (
    <span data-text-role={role}>
      {words.map((word, i) => {
        const p = ramp(frame, start + i * stagger, start + i * stagger + dur);
        const q = out === undefined ? 0 : ramp(frame, out + i * 0.6, out + i * 0.6 + 8, easeInOut);
        return (
          <React.Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span style={MASK}>
              <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110 + q * 110}%)`}}>{word}</span>
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
};

// Flat stand-in for interview footage: back wall panel, guest silhouette, podcast mic.
const Footage: React.FC<{theme: Theme; frame: number}> = ({theme, frame}) => {
  const sway = Math.sin((frame / lowerthirdMeta.durationInFrames) * Math.PI * 2) * 6;
  return (
    <AbsoluteFill style={{background: theme.background}}>
      <div style={{position: 'absolute', left: 1040, top: 0, width: 880, height: H, background: `${theme.surface}59`}} />
      <div style={{position: 'absolute', left: 1040, top: 0, width: 10, height: H, background: `${theme.surface}99`}} />
      <div
        style={{
          position: 'absolute',
          left: 1150 + sway * 0.6,
          top: 600,
          width: 640,
          height: 520,
          borderRadius: '320px 320px 0 0',
          background: `${theme.foreground}12`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1345 + sway,
          top: 262,
          width: 250,
          height: 290,
          borderRadius: '50%',
          background: `${theme.foreground}17`,
        }}
      />
      <div style={{position: 'absolute', left: 1232, top: 700, width: 14, height: 380, background: theme.surface}} />
      <div style={{position: 'absolute', left: 1200, top: 560, width: 78, height: 170, borderRadius: 39, background: theme.surface}} />
    </AbsoluteFill>
  );
};

export const Lowerthird: React.FC<LowerthirdProps> = ({texts, theme}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // On-air meter: steps forward one third on each beat, critically damped.
  const meter = (beats: number[]) =>
    beats.reduce(
      (acc, at) => acc + (f < at ? 0 : spring({frame: f - at, fps, config: {damping: 200}, durationInFrames: 10})) / beats.length,
      0,
    );

  // ---------- The spine: bar -> rule -> block -> bar ----------
  const hA = ramp(f, A + 86, A + 94, easeInOut);
  const wA = ramp(f, A + 88, A + 100);
  const mB = ramp(f, B + 84, B + 96);
  const mC = ramp(f, C + 80, END, easeInOut);
  let sw = mix(SPINE_W, RULE_W, wA);
  let sh = mix(SPINE_H, RULE_H, hA);
  let st = TOP;
  if (f >= B + 84) {
    sw = mix(RULE_W, BLOCK, mB);
    sh = mix(RULE_H, BLOCK, mB);
    st = mix(TOP, BASE - BLOCK, mB);
  }
  if (f >= C + 80) {
    sw = mix(BLOCK, SPINE_W, mC);
    sh = mix(BLOCK, SPINE_H, mC);
    st = mix(BASE - BLOCK, TOP, mC);
  }

  // ---------- Scene 1: name strap ----------
  const nameVis = Math.min(ramp(f, A, A + 14), 1 - ramp(f, A + 75, A + 86, easeInOut));
  const headVis = Math.min(ramp(f, A + 14, A + 26), 1 - ramp(f, A + 73, A + 84, easeInOut));
  const brandSize = fit(texts.brand, 72, 800, 0.62);
  const headSize = fit(texts.headline, 38, 800, 0.56);
  const meter1 = meter([A + 45, A + 60, A + 75]);

  // ---------- Scene 2: topic strap ----------
  const tagVis = Math.min(ramp(f, B + 12, B + 24), 1 - ramp(f, B + 78, B + 86, easeInOut));
  const subSize = wrapFit(texts.subhead, 56, RULE_W, 2, 0.55, 32);
  const meter2 = meter([B + 45, B + 60, B + 75]) * (1 - ramp(f, B + 78, B + 84, easeInOut));

  // ---------- Scene 3: handle strap ----------
  const plateVis = Math.min(ramp(f, C + 8, C + 20), 1 - ramp(f, C + 72, C + 80, easeInOut));
  const tabFill = Math.min(ramp(f, C + 45, C + 53), 1 - ramp(f, C + 70, C + 78, easeInOut));
  const arrowX = (ramp(f, C + 48, C + 58) - 1) * BLOCK + ramp(f, C + 68, C + 74, easeInOut) * BLOCK;
  const ctaSize = fit(texts.cta, 72, 700, 0.62);
  const meter3 = meter([C + 30, C + 45, C + 60]);

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', fontFamily: DISPLAY}}>
      <Footage theme={theme} frame={f} />

      {/* Scene 1 plates grow out of the spine */}
      {f < B ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: X + SPINE_W,
              top: TOP,
              height: NAME_H,
              display: 'flex',
              alignItems: 'center',
              padding: '0 40px 0 32px',
              background: theme.foreground,
              color: theme.background,
              fontSize: brandSize,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              whiteSpace: 'nowrap',
              clipPath: `inset(0 ${(1 - nameVis) * 100}% 0 0)`,
            }}
          >
            <Chars text={texts.brand} role="brand" frame={f} start={A + 6} stagger={0.7} dur={11} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: X + SPINE_W,
              top: TOP + NAME_H,
              height: SPINE_H - NAME_H,
              display: 'flex',
              alignItems: 'center',
              padding: `0 32px ${METER_H}px 32px`,
              background: theme.surface,
              color: theme.foreground,
              fontSize: headSize,
              fontWeight: 500,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              clipPath: `inset(0 ${(1 - headVis) * 100}% 0 0)`,
            }}
          >
            <Words text={texts.headline} role="headline" frame={f} start={A + 19} stagger={2} dur={11} />
            <div style={{position: 'absolute', left: 0, bottom: 0, width: `${meter1 * 100}%`, height: METER_H, background: theme.accent2}} />
          </div>
        </>
      ) : null}

      {/* Scene 2: tag rises out of the rule, subhead hangs beneath it */}
      {f >= B && f < C + 10 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: X,
              top: TOP - 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              background: theme.accent2,
              color: theme.background,
              fontFamily: MONO_FONT,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              clipPath: `inset(${(1 - tagVis) * 100}% 0 0 0)`,
            }}
          >
            <Chars text={texts.point1} role="point1" frame={f} start={B + 15} stagger={0.8} dur={10} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: X,
              top: TOP + RULE_H + 20,
              width: RULE_W,
              color: theme.foreground,
              fontSize: subSize,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
            }}
          >
            <Words text={texts.subhead} role="subhead" frame={f} start={B + 20} stagger={1.2} dur={11} out={B + 78} />
          </div>
        </>
      ) : null}

      {/* Scene 3: the block tears open into the handle plate */}
      {f >= C ? (
        <div
          style={{
            position: 'absolute',
            left: X + BLOCK,
            top: BASE - BLOCK,
            height: BLOCK,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
            padding: `0 56px ${METER_H}px 14px`,
            background: theme.accent,
            color: theme.foreground,
            whiteSpace: 'nowrap',
            clipPath: `inset(0 ${(1 - plateVis) * 100}% 0 0)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            <Chars text={texts.brand} role="brand" frame={f} start={C + 14} stagger={0.5} dur={9} />
          </div>
          <div style={{fontSize: ctaSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.015em'}}>
            <Chars text={texts.cta} role="cta" frame={f} start={C + 11} stagger={0.5} dur={9} />
          </div>
          <div style={{position: 'absolute', left: 0, bottom: 0, width: `${meter3 * 100}%`, height: METER_H, background: theme.accent2}} />
        </div>
      ) : null}

      {/* The spine itself, drawn last so every strap is born from it */}
      <div
        style={{
          position: 'absolute',
          left: X,
          top: st,
          width: sw,
          height: sh,
          background: theme.accent,
          overflow: 'hidden',
        }}
      >
        {f >= B && f < B + 86 ? (
          <div style={{position: 'absolute', left: 0, top: 0, width: `${meter2 * 100}%`, height: '100%', background: theme.accent2}} />
        ) : null}
        {f >= C ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                height: BLOCK * tabFill,
                background: theme.foreground,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: BLOCK,
                height: BLOCK,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.accent,
                transform: `translateX(${arrowX}px)`,
              }}
            >
              <ArrowIcon size={64} />
            </div>
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
```