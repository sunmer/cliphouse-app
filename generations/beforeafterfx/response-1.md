FILE: meta.ts
```ts
import type {TemplateMeta} from '../contract';

// Concept: the slider handle is the argument. It wipes the headline on, drags the old way off, and becomes the CTA.
// Carrier: divider line + round knob. Line at center -> sweeps the headline on -> parks right and floods the panes ->
// drags left to reveal the new way -> drags off the edge -> the knob stretches into the CTA pill -> shrinks back to the center line.
// Effects: kinetic-type (headline, points and brand rise from line masks so the copy keeps the beat),
// split-screen (old and new panes open from the dividing line, so the comparison is the handle itself),
// crash-zoom (the check stamp hits once, on the new way, so it reads as the verdict).
export const beforeafterfxMeta: TemplateMeta = {
  id: 'beforeafterfx',
  name: 'Before After FX',
  width: 1080,
  height: 1350,
  fps: 30,
  durationInFrames: 300,
  posterFrame: 170,
  motion: ['Split screen', 'Kinetic type', 'Mask reveal', 'Line draw', 'Stamp', 'Zoom'],
  scenes: [
    {type: 'title-reveal', from: 0, duration: 90, focus: 45, roles: ['headline']},
    {type: 'comparison', from: 90, duration: 120, focus: 75, roles: ['headline', 'point1', 'point2']},
    {type: 'end-screen', from: 210, duration: 90, focus: 40, roles: ['brand', 'cta']},
  ],
};
```

FILE: schema.ts
```ts
import {z} from 'zod';
import {textsSchema, themeSchema} from '../contract';

export const beforeafterfxSchema = z.object({
  texts: textsSchema(['headline', 'point1', 'point2', 'brand', 'cta'] as const),
  theme: themeSchema,
});
export type BeforeafterfxProps = z.infer<typeof beforeafterfxSchema>;
```

FILE: Beforeafterfx.tsx
```tsx
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {clamp, easeInOut, easeOut, fit, wrapFit} from '../shared/motion';
import {DISPLAY, loadTemplateFonts} from '../shared/fonts';
import type {Role} from '../contract';
import {beforeafterfxMeta as meta} from './meta';
import type {BeforeafterfxProps} from './schema';

loadTemplateFonts();

const W = 1080;
const H = 1350;
const PAD = 80;
const CW = W - PAD * 2;
const MID = W / 2;
const KY = 1040;
const KNOB = 96;
const LINE = 6;
const BOX = MID - PAD - 60;
const NEW_X = MID + 60;
const PY = 560;
const BY = 400;
const BADGE = 128;
const PILL_W = 760;
const PILL_H = 116;
const RATIO = 0.62;
const RISE = 10;
const BEAT = 15;

const S = meta.scenes;
const T1 = S[1].from;
const T2 = S[2].from;
const END = meta.durationInFrames;

const prog = (f: number, start: number, dur: number, ease: (t: number) => number = easeOut) =>
  interpolate(f, [start, start + Math.max(1, dur)], [0, 1], {...clamp, easing: ease});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const farthest = (x: number, y: number) =>
  Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));

function wrapLines(text: string, size: number, width: number) {
  const words = text.trim().split(/\s+/);
  const per = Math.max(1, Math.floor(width / (size * RATIO)));
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > per) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

type MaskProps = {
  lines: string[];
  frame: number;
  at: number;
  stagger: number;
  size: number;
  color: string;
  lh?: number;
  align?: 'left' | 'center';
  outAt?: number;
  strikeAt?: number;
  strikeColor?: string;
  role?: Role;
};

// Words rise out of line masks; optional exit lifts them out the top; optional strike draws across each line.
const MaskLines: React.FC<MaskProps> = ({lines, frame, at, stagger, size, color, lh = 1.05, align = 'left', outAt, strikeAt, strikeColor, role}) => {
  const h = Math.ceil(size * lh);
  const out = outAt === undefined ? 0 : prog(frame, outAt, RISE, easeInOut);
  let wi = 0;
  return (
    <div data-text-role={role} style={{fontFamily: DISPLAY, fontSize: size, fontWeight: 850, lineHeight: `${h}px`, color, textAlign: align, whiteSpace: 'nowrap', letterSpacing: '-0.02em'}}>
      {lines.map((line, li) => {
        const words = line.split(' ');
        const strike = strikeAt === undefined ? 0 : prog(frame, strikeAt + li * 6, 10);
        return (
          <div key={li} style={{height: h, overflow: 'hidden'}}>
            <span style={{position: 'relative', display: 'inline-block'}}>
              {words.map((w, i) => {
                const idx = wi++;
                const t = prog(frame, at + idx * stagger, RISE);
                return (
                  <React.Fragment key={i}>
                    {i > 0 ? ' ' : ''}
                    <span style={{display: 'inline-block', transform: `translateY(${((1 - t) - out) * 105}%)`}}>{w}</span>
                  </React.Fragment>
                );
              })}
              {strikeAt !== undefined && (
                <div style={{position: 'absolute', left: 0, top: '50%', width: `${strike * 100}%`, height: Math.max(6, Math.round(size * 0.1)),
                  background: strikeColor, transform: `translateY(-50%) translateY(${-out * h * 1.05}px)`}} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Beforeafterfx: React.FC<BeforeafterfxProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();

  // Handle position: center -> left margin -> sweep right -> drag to center -> drag off the left edge.
  let hx: number;
  if (frame < 12) hx = lerp(MID, PAD, prog(frame, 0, 10, easeInOut));
  else if (frame < T1 + 15) hx = lerp(PAD, W - PAD, prog(frame, 12, 30, easeInOut));
  else if (frame < T2 - 16) hx = lerp(W - PAD, MID, prog(frame, T1 + 15, 28));
  else hx = lerp(MID, 0, prog(frame, T2 - 16, 12, easeInOut));

  // End card: knob travels to center and stretches into the pill, then shrinks back and the line regrows.
  const travel = prog(frame, T2 - 4, 14);
  const knobX = frame < T2 - 4 ? hx : lerp(0, MID, travel);
  const grow = travel * (1 - prog(frame, END - 22, 10, easeInOut));
  const knobW = lerp(KNOB, PILL_W, grow);
  const knobH = lerp(KNOB, PILL_H, grow);
  const lineScale = Math.max(0, 1 - prog(frame, T2 - 4, 12)) + prog(frame, END - 13, 12, easeInOut);
  const phase = frame % BEAT;
  const nudge = 5 * (prog(phase, 0, 3) - prog(phase, 3, 9));

  // Panes flood out from the parked divider.
  const flood = prog(frame, T1 - 12, 12);
  const endFlood = prog(frame, END - 15, 11);

  // Headline: big title, lifted into a header for the comparison.
  const headSize = wrapFit(texts.headline, 120, CW, 2, RATIO, 48);
  const headLines = wrapLines(texts.headline, headSize, CW);
  const headH = headLines.length * Math.ceil(headSize * 1.05);
  const lift = prog(frame, T1 - 15, 14, easeInOut);
  const headY = lerp(520 - headH / 2, PAD, lift);
  const headScale = lerp(1, 0.42, lift);
  const headline = (color: string, role?: Role) => (
    <div style={{position: 'absolute', left: PAD, top: headY, width: CW, transformOrigin: '0 0', transform: `scale(${headScale})`}}>
      <MaskLines role={role} lines={headLines} frame={frame} at={15} stagger={4} size={headSize} color={color} outAt={T2 - 18} />
    </div>
  );

  // Points.
  const p1Size = wrapFit(texts.point1, 76, BOX, 2, RATIO, 36);
  const p1Lines = wrapLines(texts.point1, p1Size, BOX);
  const p2Size = wrapFit(texts.point2, 76, BOX, 2, RATIO, 36);
  const p2Lines = wrapLines(texts.point2, p2Size, BOX);
  const crossScale = prog(frame, T1 + 44, 8);
  const crash = prog(frame, T1 + 58, 12);
  const checkScale = frame < T1 + 58 ? 0 : lerp(2.4, 1, crash) * (1 - prog(frame, T2 - 14, 10, easeInOut));

  // Brand and CTA.
  const brandSize = wrapFit(texts.brand, 150, CW, 2, RATIO, 56);
  const brandLines = wrapLines(texts.brand, brandSize, CW);
  const brandH = brandLines.length * Math.ceil(brandSize * 1.05);
  const ctaSize = fit(texts.cta, 48, PILL_W - 120, RATIO);

  const seq = (i: number, children: React.ReactNode) => (
    <Sequence key={i} name={S[i].type} from={S[i].from} durationInFrames={S[i].duration} layout="none">
      {children}
    </Sequence>
  );

  return (
    <AbsoluteFill style={{background: theme.background, overflow: 'hidden', fontFamily: DISPLAY}}>
      {/* Old way: everything left of the handle. */}
      <AbsoluteFill style={{clipPath: `inset(0 ${W - hx}px 0 0)`}}>
        <AbsoluteFill style={{background: theme.background}} />
        <div style={{position: 'absolute', top: 0, bottom: 0, left: hx * (1 - flood), width: hx * flood, background: theme.surface}} />
        {seq(0, headline(theme.foreground, 'headline'))}
        {seq(1, (
          <>
            {headline(theme.foreground, 'headline')}
            <div style={{position: 'absolute', left: PAD, top: BY - BADGE / 2, width: BADGE, height: BADGE, borderRadius: 999, background: theme.accent2,
              color: theme.background, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${crossScale})`}}>
              <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </div>
            <div style={{position: 'absolute', left: PAD, top: PY, width: BOX}}>
              <MaskLines role="point1" lines={p1Lines} frame={frame} at={T1} stagger={3} size={p1Size} color={theme.foreground}
                strikeAt={T1 + 48} strikeColor={theme.accent2} />
            </div>
          </>
        ))}
      </AbsoluteFill>

      {/* New way: everything right of the handle. */}
      <AbsoluteFill style={{clipPath: `inset(0 0 0 ${hx}px)`}}>
        <AbsoluteFill style={{background: theme.background}} />
        <div style={{position: 'absolute', top: 0, bottom: 0, left: hx, width: (W - hx) * flood, background: theme.accent}} />
        {seq(0, headline(theme.background))}
        {seq(1, (
          <>
            {headline(theme.background)}
            <div style={{position: 'absolute', left: NEW_X, top: BY - BADGE / 2, width: BADGE, height: BADGE, borderRadius: 999, background: theme.background,
              color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${checkScale})`}}>
              <svg width={70} height={70} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <div style={{position: 'absolute', left: NEW_X, top: PY, width: BOX}}>
              <MaskLines role="point2" lines={p2Lines} frame={frame} at={T1 + 20} stagger={3} size={p2Size} color={theme.background} outAt={T2 - 14} />
            </div>
          </>
        ))}
        {seq(2, (
          <div style={{position: 'absolute', left: PAD, top: 520 - brandH / 2, width: CW}}>
            <MaskLines role="brand" lines={brandLines} frame={frame} at={T2 + 2} stagger={4} size={brandSize} color={theme.background} align="center" />
          </div>
        ))}
      </AbsoluteFill>

      {/* Loop close: background floods back out of the knob. */}
      {frame >= END - 15 && (
        <AbsoluteFill style={{background: theme.background, clipPath: `circle(${farthest(MID, KY) * endFlood}px at ${MID}px ${KY}px)`}} />
      )}

      {/* Carrier: divider line and knob. */}
      <div style={{position: 'absolute', left: knobX - LINE / 2, top: 0, width: LINE, height: H, background: theme.foreground,
        transformOrigin: `50% ${KY}px`, transform: `scaleY(${Math.min(1, lineScale)})`}} />
      <div style={{position: 'absolute', left: knobX - knobW / 2, top: KY - knobH / 2, width: knobW, height: knobH, borderRadius: 999,
        background: theme.foreground, color: theme.background, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {grow < 0.3 && (
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 7l-5 5 5 5" transform={`translate(${-nudge * 0.4} 0)`} />
            <path d="M14 7l5 5-5 5" transform={`translate(${nudge * 0.4} 0)`} />
          </svg>
        )}
        {seq(2, (
          <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <MaskLines role="cta" lines={[texts.cta]} frame={frame} at={T2 + 10} stagger={3} size={ctaSize} color={theme.background} lh={1.15} align="center" />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```