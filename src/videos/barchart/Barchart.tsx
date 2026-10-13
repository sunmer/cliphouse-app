import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {MaskWords, fitWords, lerp, prog, textWidth, useBeat, wordsOf} from '../beat/remotion';
import {parseChartItems} from '../beat/list';
import {easeInOut, easeOut} from '../shared/motion';
import {DISPLAY, MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import {barchartScore} from './score';
import type {BarchartProps} from './schema';

loadTemplateFonts();

const score = barchartScore;

const W = 1080;
const H = 1080;
const PAD = 90;
const CW = W - PAD * 2;
const RULE_H = 12;
const RULE_W0 = 120;
const RY0 = 300;
const BASE = 780;
const BARH = 460;
const GRID = 510;
const GAP = 28;
const COL_TOP = 170;
const COL_H = BASE - COL_TOP;
const STRIP_Y = 70;
const STRIP_H = 56;
const STRIP_FROM = 8;
const STRIP_CELLS = 12;
const STRIP_GAP = 8;

// Words of a role spread over a short, fixed span, so long copy gets tighter accents.
const stag = (n: number, span: number) => (n > 1 ? Math.min(2, span / (n - 1)) : 0);

const Words: React.FC<{text: string; at: number; size: number}> = ({text, at, size}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {wordsOf(text).map((w, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' ' : ''}
          <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: size * 1.2, lineHeight: `${size * 1.2}px`}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - prog(frame, at + i * 2, 8)) * 105}%)`}}>{w}</span>
          </span>
        </React.Fragment>
      ))}
    </>
  );
};

const countText = (display: string, t: number) => {
  const m = display.match(/^(-?\d+(?:\.(\d+))?)(.*)$/);
  if (!m) return display;
  return `${(parseFloat(m[1]) * t).toFixed(m[2]?.length ?? 0)}${m[3]}`;
};

export const Barchart: React.FC<BarchartProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const b = useBeat(score, {texts});

  // Every time below comes from the plan.
  const titleExit = b.scene(1, -1);
  const dropStart = b.scene(1, -0.25);
  const dropEnd = b.cue('baseline');
  const peakF = b.cue('peak');
  const floodStart = b.scene(2, -0.75);
  const floodEnd = b.scene(2, 0);
  const collapseStart = b.scene(2, 3.25);
  const collapseEnd = b.scene(2, 4);

  // The rule ticks wider on every beat of the title scene, then drops to become the baseline.
  const tickCount = score.scenes[0].bars * 4 - 1;
  let tickW = RULE_W0;
  for (let k = 1; k <= tickCount; k++) tickW += 60 * prog(frame, b.frame(k), 7);
  const drop = prog(frame, dropStart, dropEnd - dropStart);
  const ruleW = lerp(tickW, CW, drop);
  const ruleTop = lerp(RY0, BASE, drop);

  // Chart geometry reflows per item count.
  const points = parseChartItems(b.list).slice(0, b.items.length);
  const n = points.length;
  const bar = n ? (CW - GAP * (n - 1)) / n : CW;
  const max = Math.max(...points.map((p) => Math.abs(p.value)), 1);
  const peak = Math.max(0, points.findIndex((p) => Math.abs(p.value) === max));
  const valueSize = Math.floor(Math.min(46, ...points.map((p) => 46 * Math.min(1, (bar - 8) / textWidth(p.display, 46, 800, MONO_FONT)))));
  const labelSize = Math.min(30, ...points.map((p) => fitWords(p.label, 30, bar, 2, 650, SANS_FONT, 16)));
  const colLeft = (i: number) => PAD + i * (bar + GAP);

  // Peak record line, drawn outward from the peak bar.
  const lp = prog(frame, peakF, floodStart - peakF, easeInOut);
  const cx = colLeft(peak) + bar / 2;
  const lineL = lerp(cx, PAD, lp);
  const lineR = lerp(cx, PAD + CW, lp);

  // Flood: starts as the peak bar, covers the frame, then collapses to the opening rule.
  const p1 = prog(frame, floodStart, floodEnd - floodStart, easeOut);
  const p2 = prog(frame, collapseStart, collapseEnd - collapseStart, easeOut);
  const barRect = [BASE - BARH, W - (colLeft(peak) + bar), H - BASE, colLeft(peak)];
  const ruleRect = [RY0, W - PAD - RULE_W0, H - RY0 - RULE_H, PAD];
  const inset = barRect.map((v, k) => lerp(lerp(v, 0, p1), ruleRect[k], p2));

  const headSize = fitWords(texts.headline, 130, CW, 2, 900, DISPLAY, 48);
  const subSize = fitWords(texts.subhead, 44, CW, 2, 500, SANS_FONT, 24);
  const brandSize = fitWords(texts.brand, 150, CW, 2, 900, DISPLAY, 56);
  const noteSize = fitWords(texts.attribution, 34, CW, 2, 600, MONO_FONT, 20);
  const chartOn = frame < floodEnd;
  const panel = prog(frame, dropEnd, 12);

  // Beat strip: one cell rises on every beat from beat 8 to the end.
  const cellW = (CW - STRIP_GAP * (STRIP_CELLS - 1)) / STRIP_CELLS;
  const stripColor = inset[0] <= STRIP_Y ? theme.background : theme.foreground;

  return (
    <AbsoluteFill style={{width: W, height: H, overflow: 'hidden', background: theme.background, fontFamily: SANS_FONT}}>
      {frame < b.scene(1) && (
        <div style={{position: 'absolute', left: PAD, top: 360, width: CW, display: 'flex', flexDirection: 'column', gap: 40}}>
          <MaskWords
            role="headline" text={texts.headline} at={b.cue('headline')} stagger={stag(wordsOf(texts.headline).length, 10)}
            exit={titleExit} exitDir={1} size={headSize} lineHeight={1.04}
            style={{fontFamily: DISPLAY, fontWeight: 900, color: theme.foreground}}
          />
          <MaskWords
            role="subhead" text={texts.subhead} at={b.cue('subhead')} stagger={stag(wordsOf(texts.subhead).length, 16)}
            exit={titleExit} exitDir={1} size={subSize} lineHeight={1.25}
            style={{fontWeight: 500, color: `${theme.foreground}aa`}}
          />
        </div>
      )}

      {chartOn && (
        <>
          <div style={{position: 'absolute', left: PAD, top: 200, width: CW, height: BASE - 200, background: theme.surface, clipPath: `inset(${(1 - panel) * 100}% 0 0 0)`}} />
          {[0.25, 0.5, 0.75, 1].map((g, i) => (
            <div key={g} style={{position: 'absolute', left: PAD, top: BASE - GRID * g, width: CW, height: 2, background: `${theme.foreground}14`, clipPath: `inset(0 ${(1 - prog(frame, dropEnd + i * 2, 10)) * 100}% 0 0)`}} />
          ))}
          <div style={{position: 'absolute', left: PAD, top: ruleTop, width: ruleW, height: RULE_H, background: theme.accent}} />
          {n > 0 && (
            <div style={{position: 'absolute', left: PAD, top: BASE - BARH - 1, width: CW, height: 3, background: theme.accent, clipPath: `inset(0 ${PAD + CW - lineR}px 0 ${lineL - PAD}px)`}} />
          )}
          {points.map((p, i) => {
            const it = b.items[i];
            const t = prog(frame, it.startFrame, it.accentFrame - it.startFrame);
            const h = (Math.abs(p.value) / max) * BARH * t;
            const isPeak = i === peak;
            const vin = prog(frame, it.startFrame, 8);
            return (
              <div key={i} data-text-role="list" data-list-item={i} data-list-part="row" style={{position: 'absolute', left: colLeft(i), top: COL_TOP, width: bar, height: COL_H}}>
                <div data-list-part="bar" data-list-item={i} data-list-align="x" style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height: h, background: isPeak ? theme.accent : theme.accent2}} />
                <div style={{position: 'absolute', left: 0, top: COL_H + RULE_H + 24, width: '100%', textAlign: 'center', fontSize: labelSize, fontWeight: 650, color: `${theme.foreground}cc`}}>
                  <Words text={p.label} at={it.startFrame} size={labelSize} />
                </div>
                {' '}
                <div style={{position: 'absolute', left: 0, width: '100%', bottom: h + 14, height: valueSize * 1.2, overflow: 'hidden', textAlign: 'center'}}>
                  <span data-list-part="value" data-list-item={i} data-list-align="x" style={{display: 'inline-block', fontFamily: MONO_FONT, fontWeight: 800, fontSize: valueSize, lineHeight: `${valueSize * 1.2}px`, color: isPeak ? theme.accent : theme.foreground, transform: `translateY(${(1 - vin) * 105}%)`}}>
                    {countText(p.display, t)}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {frame >= floodStart && (
        <AbsoluteFill style={{background: theme.accent, clipPath: `inset(${inset[0]}px ${inset[1]}px ${inset[2]}px ${inset[3]}px)`}}>
          <div style={{position: 'absolute', left: PAD, top: 0, bottom: 0, width: CW, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36}}>
            <MaskWords
              role="brand" text={texts.brand} at={b.cue('sourceBrand')} stagger={stag(wordsOf(texts.brand).length, 6)}
              exit={collapseStart} exitDir={1} size={brandSize}
              style={{fontFamily: DISPLAY, fontWeight: 900, color: theme.background}}
            />
            <div style={{height: 4, width: CW * prog(frame, b.cue('sourceBrand'), collapseStart - b.cue('sourceBrand'), easeInOut), background: theme.background}} />
            <MaskWords
              role="attribution" text={texts.attribution} at={b.cue('sourceNote')} stagger={stag(wordsOf(texts.attribution).length, 6)}
              exit={collapseStart} exitDir={1} size={noteSize} lineHeight={1.2}
              style={{fontFamily: MONO_FONT, fontWeight: 700, color: theme.background}}
            />
          </div>
        </AbsoluteFill>
      )}

      {frame >= b.frame(STRIP_FROM) && (
        <div style={{position: 'absolute', left: PAD, top: STRIP_Y, width: CW, height: STRIP_H, clipPath: `inset(0 ${p2 * 100}% 0 0)`}}>
          {Array.from({length: STRIP_CELLS}, (_, k) => (
            <div
              key={k}
              style={{
                position: 'absolute', left: k * (cellW + STRIP_GAP), top: 0, width: cellW, height: STRIP_H,
                background: stripColor, clipPath: `inset(${(1 - prog(frame, b.frame(STRIP_FROM + k), 8)) * 100}% 0 0 0)`,
              }}
            />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
