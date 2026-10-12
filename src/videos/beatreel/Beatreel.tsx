import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ArrowIcon, clamp, easeIn, easeInOut, easeOut} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {MaskWords, fitWords, lerp, prog, rowsAt, useMusic} from '../music/remotion';
import {sceneStartBeat} from '../music/score';
import {beatreelScore as score} from './score';
import type {BeatreelProps} from './schema';

loadTemplateFonts();

// Concept: one accent bar keeps time. It is the title rule, then the list bars, then a cube,
// then the chart columns, and it returns as the end-title rule that the loop starts from.
const W = 1920;
const H = 1080;
const PAD = 120;
const INNER = W - PAD * 2;
const RULE_Y = 640;
const RULE_H = 20;
const R = 0.62; // glyph width ratio of uppercase Archivo at weight 850

type Rect = {x: number; y: number; w: number; h: number};
const mix = (a: Rect, b: Rect, t: number): Rect => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t)});
const box = (r: Rect, color: string, extra?: React.CSSProperties): React.CSSProperties =>
  ({position: 'absolute', left: r.x, top: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), background: color, ...extra});
const rise = (tin: number, tout = 0) => `translateY(${(1 - tin) * 105 - tout * 105}%)`;

export const Beatreel: React.FC<BeatreelProps> = (props) => {
  const {texts, theme} = props;
  const frame = useCurrentFrame();
  const m = useMusic(score, props);
  const b = (beat: number) => m.frame(beat);
  const sc = (i: number, beat = 0) => b(sceneStartBeat(score, i) + beat);
  const hide = m.isHidden;
  const word = m.wordFrame;

  // Scene 1: the headline stands on the rule, the brand hangs under it.
  const brandSize = fitWords(texts.brand.toUpperCase(), 60, INNER * 0.6, 1, 850, DISPLAY, 32);
  const headSize = fitWords(texts.headline.toUpperCase(), 210, INNER, 2, 850, DISPLAY, 90);
  const headRows = fitWords(texts.headline.toUpperCase(), 210, INNER, 1, 850, DISPLAY, 90) === headSize ? 1 : 2;

  // Scene 2: list bars grow out of the rule. Hidden points free their row.
  const points = (['point1', 'point2', 'point3'] as const).filter((r) => !hide(r));
  const rowH = 150;
  const gap = 36;
  const listTop = (H - points.length * rowH - (points.length - 1) * gap) / 2;
  const rowY = (i: number) => listTop + i * (rowH + gap);
  const pointSize = Math.min(96, ...points.map((r) => fitWords(texts[r].toUpperCase(), 96, INNER - 240, 1, 850, DISPLAY, 48)));
  // After every point lands, a reader square steps down the rows on each beat.
  const readFrom = sc(1, 6);
  const reading = frame >= readFrom && frame < sc(2) - 2;
  const readRow = Math.min(points.length - 1, Math.floor((frame - readFrom) / 15) % Math.max(1, points.length));
  const readStep = prog((frame - readFrom) % 15, 0, 6);

  // The accent bar's path through scenes 1-3.
  const tick: Rect = {x: PAD, y: RULE_Y, w: RULE_H, h: RULE_H};
  const rule: Rect = {x: PAD, y: RULE_Y, w: INNER, h: RULE_H};
  const listBar = (i: number): Rect => ({x: PAD, y: rowY(i), w: INNER, h: rowH});
  const C = 380;
  const cube: Rect = {x: (W - C) / 2, y: (H - C) / 2, w: C, h: C};
  const steps = [0, 1, 2, 3].reduce((n, k) => n + prog(frame, b(k), 6) / 4, 0);
  let bar = mix(tick, rule, steps);
  if (frame >= sc(1) - 6) bar = mix(rule, listBar(0), prog(frame, sc(1) - 6, 10));
  if (frame >= sc(2)) bar = mix(listBar(0), cube, prog(frame, sc(2), 10, easeInOut));

  // Scene 3: 2D to 3D. The bar becomes the front of a cube that turns a quarter on every beat.
  const turns = [1, 2, 3].reduce((n, k) => n + prog(frame, sc(2, k), 10, easeInOut), 0);
  const depth = prog(frame, sc(2) + 6, 9);

  // Scene 4: data. The cube drops into four columns and the stat counts up on the beats.
  const digits = texts.stat.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '0';
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  const counted = Number(digits) * interpolate(frame, [sc(3), sc(3, 2)], [0, 1], {...clamp, easing: easeOut});
  const stat = frame >= sc(3, 2) ? texts.stat : texts.stat.replace(digits, counted.toFixed(decimals));
  const statSize = fitWords(texts.stat, 300, INNER * 0.5, 1, 850, DISPLAY, 120);
  const cols = [0.38, 0.62, 0.5, 0.86];
  const colW = 120;
  const colGap = 40;
  const colX = (i: number) => W - PAD - (cols.length - i) * (colW + colGap) + colGap;
  const base = 860;
  const colTop = (i: number) => base - 520 * cols[i];

  // Scene 5: the end title. The last column floods the frame on the downbeat impact, then retracts to the rule.
  const endSize = fitWords(texts.brand.toUpperCase(), 190, INNER, 1, 850, DISPLAY, 80);
  const subSize = fitWords(texts.subhead, 46, INNER * 0.8, 2, 500, DISPLAY, 28);
  const ctaSize = fitWords(texts.cta, 42, 600, 1, 800, DISPLAY, 26);
  const ctaW = Math.min(760, texts.cta.length * ctaSize * 0.56 + 160);
  // The flood covers the frame on the impact, then wipes upward and reveals the end title under it.
  const flood = mix({x: colX(3), y: colTop(3), w: colW, h: base - colTop(3)}, {x: 0, y: 0, w: W, h: H}, prog(frame, sc(4) - 10, 10));
  const recede = prog(frame, sc(4), 12, easeInOut);
  const loop = prog(frame, b(30), 20, easeInOut);
  const endRule = mix(rule, tick, loop);

  return (
    <AbsoluteFill style={{background: theme.background, color: theme.foreground, fontFamily: DISPLAY, overflow: 'hidden'}}>
      {/* Bar counter: four cells along the top margin; the current beat's cell fills from the left on its kick.
          It keeps time for the whole loop, so holds always have motion while text stays still. */}
      <div style={{position: 'absolute', left: PAD, top: 64, display: 'flex', gap: 12}}>
        {[0, 1, 2, 3].map((k) => {
          const on = k === Math.floor(frame / 15) % 4;
          return (
            <div key={k} style={{width: 72, height: 12, background: theme.surface, overflow: 'hidden'}}>
              <div style={{width: '100%', height: '100%', background: theme.accent, transformOrigin: 'left center', transform: `scaleX(${on ? prog(frame % 15, 0, 5) : 0})`}} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', right: PAD, top: 62, fontFamily: MONO_FONT, fontSize: 24, fontWeight: 600, color: theme.surface}}>
        {`${String(Math.floor(frame / 60) + 1).padStart(2, '0')}/08`}
      </div>

      {frame < sc(1) + 2 && (
        <>
          <div style={{position: 'absolute', left: PAD, width: INNER, top: RULE_Y - 32 - headSize * headRows, height: headSize * headRows}}>
            <MaskWords role="headline" text={texts.headline.toUpperCase()} size={headSize} lineHeight={1} at={(i) => word('headline', i) - 4}
              exit={sc(1) - 13} style={{fontWeight: 850}} />
          </div>
          <div style={{position: 'absolute', left: PAD, top: RULE_Y + RULE_H + 28, height: brandSize * 1.15, overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <div style={{fontSize: brandSize, fontWeight: 800, lineHeight: `${brandSize * 1.15}px`, color: theme.accent,
              transform: rise(prog(frame, word('brand', 0) - 3, 8), prog(frame, sc(1) - 9, 7, easeIn))}}>
              <span data-text-role="brand">{texts.brand.toUpperCase()}</span>
            </div>
          </div>
        </>
      )}

      {frame < sc(2) + 10 && <div style={box(bar, theme.accent)} />}

      {frame >= sc(1) - 6 && frame < sc(2) + 10 && points.map((role, i) => {
        const grow = i === 0 ? 1 : prog(frame, word(role, 0) - 6, 10);
        const leave = i === 0 ? 0 : prog(frame, sc(2) - 2, 9, easeIn);
        const width = INNER * grow * (1 - leave);
        const color = [theme.accent, theme.foreground, theme.accent2][i];
        const textClip = i === 0 ? prog(frame, sc(2), 8, easeIn) : 1 - width / INNER;
        return (
          <div key={role} data-role-block={role}>
            {i > 0 && <div style={box({...listBar(i), w: width}, color)} />}
            <div style={{position: 'absolute', left: PAD + 48, top: rowY(i), width: INNER - 48, height: rowH, display: 'flex', alignItems: 'center', gap: 40,
              color: theme.background, clipPath: `inset(0 ${Math.max(0, textClip) * 100}% 0 0)`,
              transform: `translateX(${reading && readRow === i ? 28 * (1 - readStep) + 12 : 0}px)`}}>
              <span style={{fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700}}>{`0${i + 1}`}</span>
              <MaskWords role={role} text={texts[role].toUpperCase()} size={pointSize} lineHeight={1.08} at={(w) => word(role, w) - 4}
                style={{fontWeight: 850, whiteSpace: 'nowrap'}} />
            </div>
          </div>
        );
      })}
      {reading && <div style={box({x: W - PAD - 48 - 36, y: rowY(readRow) + rowH / 2 - 18, w: 36, h: 36}, theme.background)} />}

      {frame >= sc(2) + 10 && frame < sc(3) + 8 && (
        <div style={{position: 'absolute', left: cube.x, top: cube.y, width: C, height: C, perspective: 2000,
          transform: `translateY(${prog(frame, sc(3) - 4, 10, easeIn) * 220}px) scaleY(${1 - 0.5 * prog(frame, sc(3) - 4, 10, easeIn)})`}}>
          <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${-16 * depth}deg) rotateY(${-turns * 90 - 28 * depth}deg)`}}>
            {[theme.accent, theme.accent2, theme.foreground, theme.surface].map((c, k) => (
              <div key={k} style={{position: 'absolute', inset: 0, background: c, transform: `rotateY(${k * 90}deg) translateZ(${(C / 2) * depth}px)`,
                display: 'flex', alignItems: 'flex-end', padding: 30, fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, color: theme.background}}>
                {`0${k + 1}`}
              </div>
            ))}
            <div style={{position: 'absolute', inset: 0, background: theme.accent, transform: `rotateX(90deg) translateZ(${(C / 2) * depth}px)`}} />
          </div>
        </div>
      )}

      {frame >= sc(3) && frame < sc(4) + 12 && (
        <>
          {cols.map((_, i) => {
            const up = prog(frame, sc(3, i * 0.5), 9);
            const down = i === cols.length - 1 ? 0 : prog(frame, sc(4) - 4, 8, easeIn);
            const h = (base - colTop(i)) * up * (1 - down);
            return <div key={i} style={box({x: colX(i), y: base - h, w: colW, h}, i === cols.length - 1 ? theme.accent : theme.surface)} />;
          })}
          <div style={box({x: PAD, y: base, w: INNER * prog(frame, sc(3), 8) * (1 - prog(frame, sc(4) - 4, 8, easeIn)), h: 6}, theme.foreground)} />
          <div style={{position: 'absolute', left: PAD, top: base - statSize * 1.05 - 40, height: statSize * 1.05, overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <div style={{fontSize: statSize, fontWeight: 850, lineHeight: `${statSize * 1.05}px`, fontVariantNumeric: 'tabular-nums',
              transform: rise(prog(frame, word('stat', 0) - 3, 8), prog(frame, sc(4) - 6, 7, easeIn))}}>
              <span data-text-role="stat">{stat}</span>
            </div>
          </div>
        </>
      )}

      {frame >= sc(4) - 3 && (
        <>
          <div style={{position: 'absolute', left: PAD, width: INNER, top: RULE_Y - endSize * 1.02 - 28, height: endSize * 1.02, overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <div style={{fontSize: endSize, fontWeight: 850, lineHeight: `${endSize * 1.02}px`, transformOrigin: 'left bottom',
              transform: `${rise(prog(frame, sc(4) + 2, 8), prog(frame, b(30) + 4, 8, easeIn))} scale(${1 + 0.05 * (1 - prog(frame, sc(4) + 2, 16))})`}}>
              <span data-text-role="brand">{texts.brand.toUpperCase()}</span>
            </div>
          </div>
          <div style={box(endRule, theme.accent, {width: Math.max(RULE_H, endRule.w * prog(frame, sc(4, 1), 10))})} />
          {!hide('subhead') && (
            <div data-role-block="subhead" style={{position: 'absolute', left: PAD, width: INNER * 0.8, top: RULE_Y + RULE_H + 36}}>
              <MaskWords role="subhead" text={texts.subhead} size={subSize} lineHeight={1.25} at={(i) => word('subhead', i) - 4}
                exit={b(30) + 2} style={{fontWeight: 500}} />
            </div>
          )}
          <div style={{position: 'absolute', left: PAD, top: H - 130 - 92, height: 92, overflow: 'hidden', background: theme.foreground, color: theme.background,
            width: ctaW * prog(frame, word('cta', 0) - 14, 10) * (1 - prog(frame, b(30), 10, easeIn))}}>
            <div style={{position: 'absolute', left: 44, top: 0, height: 92, width: ctaW - 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24}}>
              <MaskWords role="cta" text={texts.cta} size={ctaSize} lineHeight={1.3} at={(i) => word('cta', i) - 3} style={{fontWeight: 800, whiteSpace: 'nowrap'}} />
              <div style={{display: 'flex', transform: `translateX(${(1 - prog(frame, word('cta', 0) + 4, 8)) * -60 + (frame >= b(28) ? 8 * prog(frame % 15, 0, 6) : 0)}px)`}}><ArrowIcon size={36} /></div>
            </div>
          </div>
          <div style={box(flood, theme.accent, {clipPath: `inset(0 0 ${recede * 100}% 0)`})} />
        </>
      )}
    </AbsoluteFill>
  );
};
