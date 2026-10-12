import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ArrowIcon, easeIn, easeInOut} from '../shared/motion';
import {DISPLAY, MONO_FONT, loadTemplateFonts} from '../shared/fonts';
import {MaskWords, fitWords, lerp, prog, rowsAt, textWidth, useMusic} from '../music/remotion';
import {sceneStartBeat} from '../music/score';
import {productpulseScore as score} from './score';
import type {ProductpulseProps} from './schema';

loadTemplateFonts();

// Concept: the accent dot is the product's heartbeat. It pulses on the kick, stretches into the
// claim's underline, splits into one marker per benefit, and grows into the CTA button.
const W = 1080;
const H = 1920;
const PAD = 96;
const INNER = W - PAD * 2;
const DOT = 56;

type Rect = {x: number; y: number; w: number; h: number; r: number};
const mix = (a: Rect, b: Rect, t: number): Rect => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), r: lerp(a.r, b.r, t)});
const shape = (r: Rect, color: string): React.CSSProperties =>
  ({position: 'absolute', left: r.x, top: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), borderRadius: r.r, background: color});
const rise = (tin: number, tout = 0) => `translateY(${(1 - tin) * 105 - tout * 105}%)`;

export const Productpulse: React.FC<ProductpulseProps> = (props) => {
  const {texts, theme} = props;
  const frame = useCurrentFrame();
  const m = useMusic(score, props);
  const b = (beat: number) => m.frame(beat);
  const sc = (i: number, beat = 0) => b(sceneStartBeat(score, i) + beat);
  const word = m.wordFrame;

  // The dot pulses on each kick: a quick squash, then a critically damped settle.
  const beatPhase = (frame % 15) / 15;
  const pulse = 1 + 0.18 * Math.exp(-beatPhase * 9);

  const HEAD = texts.headline.toUpperCase();
  const headSize = fitWords(HEAD, 150, INNER, 3, 850, DISPLAY, 72);
  const headRows = rowsAt(HEAD, headSize, INNER, 850, DISPLAY);
  // The claim stands on the underline at the vertical center.
  const LINE_Y = 980;
  const headTop = LINE_Y - 36 - headRows * headSize;
  const brandSize = fitWords(texts.brand.toUpperCase(), 44, INNER - DOT - 30, 1, 850, DISPLAY, 28);

  const points = (['point1', 'point2', 'point3'] as const).filter((r) => !m.isHidden(r));
  const rowH = 230;
  const listTop = LINE_Y - (points.length * rowH) / 2;
  const rowY = (i: number) => listTop + i * rowH;
  const pointSize = Math.min(104, ...points.map((r) => fitWords(texts[r].toUpperCase(), 104, INNER - 120, 1, 850, DISPLAY, 56)));

  // Button: 64 px side padding, the label, a 28 px gap, and a 52 px arrow.
  const ctaSize = fitWords(texts.cta, 64, INNER - 128 - 80, 1, 800, DISPLAY, 34);
  const ctaW = Math.min(INNER, textWidth(texts.cta, ctaSize, 800, DISPLAY) + 128 + 80);
  const endBrand = fitWords(texts.brand.toUpperCase(), 96, INNER, 1, 850, DISPLAY, 40);

  // The dot's path.
  const home: Rect = {x: PAD, y: 200, w: DOT, h: DOT, r: DOT / 2};
  const underline: Rect = {x: PAD, y: LINE_Y, w: INNER, h: 22, r: 0};
  const marker = (i: number): Rect => ({x: PAD, y: rowY(i) + rowH / 2 - DOT / 2, w: DOT, h: DOT, r: DOT / 2});
  const button: Rect = {x: (W - ctaW) / 2, y: LINE_Y + 40, w: ctaW, h: 150, r: 75};
  let dot = home;
  // Beat 4: the dot drops under the claim. Beats 5 and 6: the underline grows in two steps on the kick.
  const under = (w: number): Rect => ({...underline, w});
  if (frame >= b(4)) dot = mix(home, under(DOT), prog(frame, b(4), 9));
  if (frame >= b(5)) dot = mix(under(DOT), under(INNER / 2), prog(frame, b(5), 9));
  if (frame >= b(6)) dot = mix(under(INNER / 2), underline, prog(frame, b(6), 9));
  if (frame >= sc(1) - 4) dot = mix(underline, marker(0), prog(frame, sc(1) - 4, 10, easeInOut));
  // The button is full width two frames before the first CTA word lands.
  const ctaOpen = Math.min(sc(2) - 6, word('cta', 0) - 14);
  if (frame >= ctaOpen) dot = mix(marker(0), button, prog(frame, ctaOpen, 10, easeInOut));
  if (frame >= b(19)) dot = mix(button, home, prog(frame, b(19), 15, easeInOut));
  const dotScale = frame < b(4) || (frame >= b(19) + 15) ? pulse : 1;
  // Once every benefit is on screen, the heartbeat moves from marker to marker on each beat.
  // From beat 11, a highlight bar slides to the next benefit on every beat until the CTA takes over.
  const readFrom = sc(1, 3);
  const activeRow = frame >= readFrom ? Math.floor((frame - readFrom) / 15) % Math.max(1, points.length) : -1;
  const readStep = frame >= readFrom ? prog((frame - readFrom) % 15, 0, 7) : 0;
  const prevRow = activeRow <= 0 ? Math.max(0, points.length - 1) : activeRow - 1;
  const highlightY = lerp(rowY(frame - readFrom < 15 ? activeRow : prevRow), rowY(activeRow), readStep);
  // Intro beats 4-5 and the end card's last beats tick on the kick: the headline's underline flashes a notch
  // and the button nudges. Each moves on its beat and settles within the beat.
  const kick = Math.exp(-beatPhase * 7);
  // On the end card the arrow nudges on each kick; the button and its label stay still so they read.

  return (
    <AbsoluteFill style={{background: theme.background, color: theme.foreground, fontFamily: DISPLAY, overflow: 'hidden'}}>
      {/* The surface panel slides up on the impact and drops on the loop, framing the CTA. */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: H * prog(frame, sc(2) - 2, 10) * (1 - prog(frame, b(19), 12, easeIn)), background: theme.surface}} />
      {/* The reading bar: a surface band behind the current benefit, sliding row to row on the beat. */}
      {activeRow >= 0 && frame < sc(2) - 8 && (
        <div style={{position: 'absolute', left: PAD - 24, width: INNER + 48, top: highlightY + 18, height: rowH - 36, background: theme.surface, borderRadius: 8}} />
      )}
      {/* Beat strip along the bottom margin: one cell per beat of the bar fills on its kick, for the whole loop. */}
      <div style={{position: 'absolute', left: PAD, right: PAD, bottom: 120, display: 'flex', gap: 12}}>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{flex: 1, height: 10, borderRadius: 5, background: theme.surface, overflow: 'hidden'}}>
            <div style={{width: '100%', height: '100%', background: theme.foreground, transformOrigin: 'left center',
              transform: `scaleX(${k === Math.floor(frame / 15) % 4 ? prog(frame % 15, 0, 5) : 0})`}} />
          </div>
        ))}
      </div>

      {frame < sc(1) + 4 && (
        <>
          <div style={{position: 'absolute', left: PAD + DOT + 30, top: 200, height: DOT, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <div style={{fontSize: brandSize, fontWeight: 800, letterSpacing: 0, transform: rise(prog(frame, word('brand', 0) - 3, 8), prog(frame, sc(1) - 8, 7, easeIn))}}>
              <span data-text-role="brand">{texts.brand.toUpperCase()}</span>
            </div>
          </div>
          <div style={{position: 'absolute', left: PAD, top: headTop - 20, width: INNER}}>
            <MaskWords role="headline" text={texts.headline.toUpperCase()} size={headSize} lineHeight={1} at={(i) => word('headline', i) - 4}
              exit={sc(1) - 15} style={{fontWeight: 850}} />
          </div>
        </>
      )}

      {frame >= sc(1) - 4 && frame < sc(2) + 4 && points.map((role, i) => {
        const at = word(role, 0);
        const mark = i === 0 ? null : mix(marker(0), marker(i), prog(frame, at - 8, 10));
        const leave = prog(frame, sc(2) - 8, 8, easeIn);
        const beatScale = 1;
        return (
          <div key={role} data-role-block={role}>
            {mark && <div style={{...shape({...mark, w: mark.w * (1 - leave), h: mark.h * (1 - leave)}, [theme.accent, theme.accent2, theme.foreground][i]), transform: `scale(${beatScale})`}} />}
            <div style={{position: 'absolute', left: PAD + DOT + 40, width: INNER - DOT - 40, top: rowY(i) + (rowH - pointSize * 1.08) / 2}}>
              <MaskWords role={role} text={texts[role].toUpperCase()} size={pointSize} lineHeight={1.08} at={(w) => word(role, w) - 4}
                exit={sc(2) - 10 + i} style={{fontWeight: 850, whiteSpace: 'nowrap'}} />
            </div>
          </div>
        );
      })}
      {frame >= sc(1) && frame < sc(2) + 4 && (
        <div style={{position: 'absolute', left: PAD, top: listTop - 90, fontFamily: MONO_FONT, fontSize: 30, fontWeight: 700, color: theme.accent, overflow: 'hidden', height: 40}}>
          <div style={{transform: rise(prog(frame, sc(1), 8), prog(frame, sc(2) - 8, 7, easeIn))}}>{`${String(points.length).padStart(2, '0')} REASONS`}</div>
        </div>
      )}

      {/* The dot: home, underline, first marker, CTA button, home again. */}
      <div style={{...shape(dot, theme.accent), transform: `scale(${activeRow === 0 && frame < sc(2) - 6 ? pulse : dotScale})`, transformOrigin: 'center'}}>
        {frame >= sc(2) - 2 && frame < b(19) + 6 && (
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, color: theme.background, overflow: 'hidden'}}>
            <MaskWords role="cta" text={texts.cta} size={ctaSize} lineHeight={1.3} at={(i) => word('cta', i) - 2} exit={b(19) - 2}
              style={{fontWeight: 800, whiteSpace: 'nowrap'}} />
            <div style={{display: 'flex', overflow: 'hidden', height: 52}}>
              <div style={{display: 'flex', transform: `${rise(prog(frame, word('cta', 0) + 6, 8), prog(frame, b(19) - 2, 6, easeIn))} translateX(${12 * kick}px)`}}><ArrowIcon size={52} /></div>
            </div>
          </div>
        )}
      </div>
      {/* Brand mark above the button: the end lockup. */}
      {frame >= sc(2) && frame < b(19) + 6 && (
        <div style={{position: 'absolute', left: PAD, width: INNER, top: LINE_Y - 150, height: 110, overflow: 'hidden', textAlign: 'center', whiteSpace: 'nowrap'}}>
          <div style={{fontSize: endBrand, lineHeight: '110px', fontWeight: 850,
            transform: rise(prog(frame, sc(2) + 2, 8), prog(frame, b(19) - 4, 7, easeIn))}}><span data-text-role="brand">{texts.brand.toUpperCase()}</span></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
