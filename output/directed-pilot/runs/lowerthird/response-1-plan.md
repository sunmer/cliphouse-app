CONCEPT: One accent spine builds every strap. It wipes the name plate out of itself, falls over into the topic rule, folds into the handle tab, then stands back up. A four-beat ruler counts each strap on air.

BEATS:
0–14: The accent spine stands alone. The white name plate wipes out of it.
15: Brand characters rise from the plate mask. The headline row wipes out from the spine.
30: Headline words have landed, so the name strap is complete.
45: Ruler tick 1 fills.
60: Ruler tick 2 fills.
75: Ruler tick 3 fills. Both plates retract into the spine.
90: The spine falls over and becomes a 1200 px accent rule (lands about frame 98).
105: The point1 tag rises out of the rule.
120: Subhead words have risen in on two masked lines.
135: Ruler tick 1 fills.
150: Ruler tick 2 fills.
165: Ruler tick 3 fills. The subhead drops through its mask and the tag sinks into the rule.
180: The rule thickens and folds into a 140 px accent block.
195: Strongest moment. The block tears open to the right into a long accent plate. Handle characters slam up and the brand label follows.
225: A foreground fill rises inside the tab, the arrow slides in, and ruler tick 1 fills.
240: Ruler tick 2 fills. The handle holds, readable.
250–259: Ruler tick 3 fills at 255. The plate retracts and the tab drains back to accent.
259–269: The block stands back up into the spine, matching frame 0 for the loop.

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
  posterFrame: 238,
  motion: ['Lower thirds', 'Mask reveal', 'Wipes', 'Line draw', 'Kinetic type'],
  scenes: [
    {type: 'lower-third', from: 0, duration: 90, focus: 36, roles: ['brand', 'headline']},
    {type: 'lower-third', from: 90, duration: 90, focus: 45, roles: ['point1', 'subhead']},
    {type: 'lower-third', from: 180, duration: 90, focus: 58, roles: ['brand', 'cta']},
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

// Grid: 120 px margins, the strap lives between y=800 and y=960.
const X = 120;
const TOP = 800;
const BASE = 960;
const SPINE_W = 16;
const SPINE_H = BASE - TOP;
const RULE_W = 1200;
const RULE_H = 6;
const BLOCK = 140;
const RULER_TOP = 984;

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
      <div style={{position: 'absolute', left: 1232, top: 700, width: 14, height: 380, background: `${theme.surface}`}} />
      <div style={{position: 'absolute', left: 1200, top: 560, width: 78, height: 170, borderRadius: 39, background: theme.surface}} />
    </AbsoluteFill>
  );
};

export const Lowerthird: React.FC<LowerthirdProps> = ({texts, theme}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ---------- The spine: bar -> rule -> block -> bar ----------
  const mA = ramp(f, A + 86, A + 100);
  const mB = ramp(f, B + 84, B + 96);
  const mC = ramp(f, C + 79, END, easeInOut);
  let sw = mix(SPINE_W, RULE_W, mA);
  let sh = mix(SPINE_H, RULE_H, mA);
  let st = TOP;
  if (f >= B + 84) {
    sw = mix(RULE_W, BLOCK, mB);
    sh = mix(RULE_H, BLOCK, mB);
    st = mix(TOP, BASE - BLOCK, mB);
  }
  if (f >= C + 79) {
    sw = mix(BLOCK, SPINE_W, mC);
    sh = mix(BLOCK, SPINE_H, mC);
    st = mix(BASE - BLOCK, TOP, mC);
  }

  // ---------- Scene 1: name strap ----------
  const nameVis = Math.min(ramp(f, A, A + 14), 1 - ramp(f, A + 75, A + 86, easeInOut));
  const headVis = Math.min(ramp(f, A + 14, A + 26), 1 - ramp(f, A + 73, A + 84, easeInOut));
  const brandSize = fit(texts.brand, 64, 880, 0.62);
  const headSize = fit(texts.headline, 32, 880, 0.56);

  // ---------- Scene 2: topic strap ----------
  const tagVis = Math.min(ramp(f, B + 12, B + 24), 1 - ramp(f, B + 78, B + 86, easeInOut));
  const subSize = wrapFit(texts.subhead, 56, RULE_W, 2, 0.55, 32);

  // ---------- Scene 3: handle strap ----------
  const plateVis = Math.min(ramp(f, C + 12, C + 26), 1 - ramp(f, C + 70, C + 79, easeInOut));
  const tabFill = Math.min(ramp(f, C + 45, C + 53), 1 - ramp(f, C + 68, C + 76, easeInOut));
  const arrowX = (ramp(f, C + 48, C + 58) - 1) * BLOCK + ramp(f, C + 66, C + 72, easeInOut) * BLOCK;
  const ctaSize = fit(texts.cta, 64, 900, 0.62);

  // ---------- Ruler: three ticks counted in per strap, cleared at each handoff ----------
  const ticks = [0, 1, 2].map((i) =>
    [A, B, C].reduce((acc, s) => {
      const at = s + 45 + i * 15;
      const fill = f < at ? 0 : spring({frame: f - at, fps, config: {damping: 200}, durationInFrames: 10});
      const clear = ramp(f, s + 80, s + 88, easeInOut);
      return acc + fill * (1 - clear);
    }, 0),
  );

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
              height: 104,
              display: 'flex',
              alignItems: 'center',
              padding: '0 40px 0 32px',
              background: theme.foreground,
              color: theme.background,
              fontSize: brandSize,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
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
              top: TOP + 104,
              height: BASE - TOP - 104,
              display: 'flex',
              alignItems: 'center',
              padding: '0 32px',
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
              top: TOP + RULE_H + 22,
              width: RULE_W,
              color: theme.foreground,
              fontSize: subSize,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: '-0.01em',
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
            padding: '0 56px 0 12px',
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
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: `${theme.foreground}cc`,
              lineHeight: 1.1,
            }}
          >
            <Chars text={texts.brand} role="brand" frame={f} start={C + 18} stagger={0.6} dur={9} />
          </div>
          <div style={{fontSize: ctaSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.01em'}}>
            <Chars text={texts.cta} role="cta" frame={f} start={C + 16} stagger={0.5} dur={9} />
          </div>
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

      {/* Four-beat ruler: empty slots stay as chrome, accent2 ticks count the strap */}
      {ticks.map((t, i) => (
        <div key={i} style={{position: 'absolute', left: X + i * 46, top: RULER_TOP, width: 36, height: 6, background: `${theme.foreground}33`}}>
          <div style={{width: 36 * t, height: '100%', background: theme.accent2}} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
```