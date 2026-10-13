import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {fitWords, lerp, prog, rowsAt, useBeat, wordsOf} from '../beat/remotion';
import {ArrowIcon} from '../shared/motion';
import {MONO_FONT, SANS_FONT, loadTemplateFonts} from '../shared/fonts';
import type {Role} from '../vocab';
import {stackScore} from './score';
import type {StackProps} from './schema';

loadTemplateFonts();

const W = 1080;
const H = 1920;
const PAD = 96;
const CW = W - PAD * 2;
const COL_W = 220;
const HW = W - PAD - COL_W - 64;
const PILL_H = 76;
const HEAD_LH = 1.08;
const HEAD_SCALE = 0.7;
const GAP = 40;
const CARD_PAD = 56;
const NUM_W = 104;
const TEXT_W = CW - CARD_PAD * 2 - NUM_W - GAP;
const RULE_STEP = 40;
const RULE_SPACING = 160;
// The column's resting stub at the top edge: the first and last frame of the loop.
const STUB = RULE_SPACING;
// Durations are shares of one beat, so every move scales with the score's tempo.
const BF = stackScore.beatFrames;
const RISE = Math.round(BF / 2);
const FLOOD = Math.round(BF * 0.625);
const LIFT = Math.round(BF * 0.875);
const STEP = Math.min(10, BF);
// The column drops in two ratchets: most of the way on its cue, the rest on the step cue.
const COL_FIRST = 0.6;
// While the slabs hold, the column rebuilds in its old spot: one block on every beat after the lift.
const LIST_SCENE = 1;
const TALLY = stackScore.scenes[LIST_SCENE].bars * 4 - 1;
const TALLY_GAP = 12;

type WordsProps = {
  role: Role;
  text: string;
  at: number;
  stagger: number;
  size: number;
  weight: number;
  color: string;
  lastColor?: string;
  width?: number;
  align?: 'left' | 'center';
  lh?: number;
  item?: number;
  style?: React.CSSProperties;
};

// Words rise out of line masks, one after another, from `at`.
const Words: React.FC<WordsProps> = ({role, text, at, stagger, size, weight, color, lastColor, width, align = 'left', lh = 1.08, item, style}) => {
  const frame = useCurrentFrame();
  const words = wordsOf(text);
  const h = Math.ceil(size * lh);
  return (
    <div style={{width, fontFamily: SANS_FONT, fontSize: size, fontWeight: weight, lineHeight: `${h}px`, color, textAlign: align, whiteSpace: width === undefined ? 'nowrap' : 'normal', ...style}}>
      <span data-text-role={role} data-list-item={item}>
        {words.map((word, i) => {
          const t = prog(frame, at + i * stagger, RISE);
          return (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : ''}
              <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: h}}>
                <span style={{display: 'inline-block', color: lastColor && i === words.length - 1 ? lastColor : undefined, transform: `translateY(${(1 - t) * 105}%)`}}>{word}</span>
              </span>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

const farthest = (x: number, y: number) => Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));

export const Stack: React.FC<StackProps> = (props) => {
  const {texts, theme} = props;
  const frame = useCurrentFrame();
  const b = useBeat(stackScore, props);
  const B = b.beat;
  const at = {
    column: b.cue('column'), brand: b.cue('brand'), headline: b.cue('headline'), step: b.cue('columnStep'), lift: b.cue('lift'),
    flood: b.cue('flood'), lockBrand: b.cue('lockBrand'), cta: b.cue('ctaStamp'), close: b.cue('close'),
  };
  const listEnd = b.scene(LIST_SCENE + 1);
  const end = b.scene(stackScore.scenes.length);
  const closeDur = Math.max(1, end - 1 - at.close);

  // Backdrop rules ratchet one step per beat and wrap exactly at the loop point.
  const beatIdx = Math.floor(frame / B);
  const drift = ((beatIdx + prog(frame, b.frame(beatIdx), STEP)) * RULE_STEP) % RULE_SPACING;

  // Headline: centered in the title, then lifted into a header that leaves room for the stack.
  const headSize = fitWords(texts.headline, 190, HW, 3, 850, SANS_FONT, 56);
  const headRows = rowsAt(texts.headline, headSize, HW, 850, SANS_FONT);
  const headH = headRows * Math.ceil(headSize * HEAD_LH);
  const headY1 = PAD + PILL_H + 48;
  const headY0 = Math.max(headY1, (H - headH) / 2);
  const lift = prog(frame, at.lift, LIFT);
  const headY = lerp(headY0, headY1, lift);
  const headScale = lerp(1, HEAD_SCALE, lift);
  const headStagger = wordsOf(texts.headline).length > 3 ? 2 : 4;

  // Brand pill.
  const pillSize = fitWords(texts.brand.toUpperCase(), 36, HW - 60 - texts.brand.length * 0.14 * 36, 1, 700, SANS_FONT, 20);
  const pillIn = prog(frame, at.brand, RISE);

  // Stack layout reflows for the item count: fewer items get taller slabs and larger type.
  const n = Math.max(1, b.items.length);
  const regionTop = headY1 + headH * HEAD_SCALE + 72;
  const regionH = H - PAD - regionTop;
  const preferred = n === 1 ? 480 : n === 2 ? 380 : 300;
  const cardH = Math.min(preferred, (regionH - (n - 1) * GAP) / n);
  const stackH = n * cardH + (n - 1) * GAP;
  const cardTop = regionTop + (regionH - stackH) / 2;
  const cardY = (i: number) => cardTop + i * (cardH + GAP);
  const itemMaxSize = n === 1 ? 104 : 88;
  const palette = [
    {bg: theme.accent2, ink: theme.background, num: theme.background, rule: theme.background, edge: undefined},
    {bg: theme.accent, ink: theme.background, num: theme.background, rule: theme.background, edge: undefined},
    {bg: theme.surface, ink: theme.foreground, num: theme.accent, rule: theme.accent, edge: `${theme.foreground}24`},
  ];

  // The rebuilt column: blocks fill the free strip beside the header, top edge down to the stack.
  const tallyAvail = regionTop - 48;
  const tallyH = Math.max(16, Math.min(64, (tallyAvail - (TALLY - 1) * TALLY_GAP) / TALLY));

  // The flood grows from the last slab's number. The close irises into the returning stub.
  const ox = PAD + CARD_PAD + NUM_W / 2;
  const oy = cardY(n - 1) + cardH / 2;
  const closing = frame >= at.close;
  const cx = closing ? W - COL_W / 2 : ox;
  const cy = closing ? STUB : oy;
  const radius = closing
    ? farthest(cx, cy) * (1 - prog(frame, at.close, closeDur))
    : farthest(ox, oy) * prog(frame, at.flood, FLOOD);
  const covered = frame >= at.flood + FLOOD;
  const stubBack = STUB * prog(frame, at.close, closeDur);

  // Lockup layout.
  const brandSize = fitWords(texts.brand, 200, CW, 2, 850, SANS_FONT, 56);
  const brandH = rowsAt(texts.brand, brandSize, CW, 850, SANS_FONT) * Math.ceil(brandSize * 1.06);
  const ctaSize = fitWords(texts.cta, 64, CW - 112 - 60 - 20, 1, 800, SANS_FONT, 32);
  const ctaH = Math.ceil(ctaSize * 1.15);
  const pillBoxH = ctaH + 64;
  const lockTop = (H - (brandH + 80 + pillBoxH)) / 2;
  const stamp = prog(frame, at.cta, RISE);
  const ctaWords = wordsOf(texts.cta).length;
  const arrowIn = prog(frame, at.cta + ctaWords * 2, RISE);
  const ctaEl = frame - at.cta;
  const ctaBeat = Math.floor(ctaEl / B);
  const within = ctaEl - ctaBeat * B;
  const nudge = ctaBeat >= 1 ? 14 * (prog(within, 0, 3) - prog(within, 3, 10)) : 0;

  return (
    <AbsoluteFill style={{fontFamily: SANS_FONT, overflow: 'hidden', background: theme.background}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: -RULE_SPACING, height: H + RULE_SPACING * 2, transform: `translateY(${-drift}px)`,
        backgroundImage: `repeating-linear-gradient(0deg, ${theme.foreground}12 0 2px, transparent 2px ${RULE_SPACING}px)`}} />
      <div style={{position: 'absolute', left: PAD - 40, top: 0, bottom: 0, width: 2, background: `${theme.foreground}1c`}} />

      {!covered && Array.from({length: TALLY}, (_, k) => {
        const f = b.scene(LIST_SCENE, k + 1);
        if (frame < f) return null;
        const g = prog(frame, f, RISE);
        return (
          <div key={`t${k}`} style={{position: 'absolute', left: W - COL_W, top: k * (tallyH + TALLY_GAP), width: COL_W, height: tallyH * g,
            background: k === TALLY - 1 ? theme.accent : theme.accent2}} />
        );
      })}

      {!covered && b.items.map((t) => {
        const i = t.index;
        const pal = palette[i % 3];
        const p = prog(frame, t.startFrame, t.accentFrame - t.startFrame);
        const y = cardY(i);
        let rect: {x: number; y: number; w: number; h: number; r: number};
        if (i === 0) {
          // The title's column is the first slab: it grows from the stub in two ratchets, then topples into place.
          const grow = COL_FIRST * prog(frame, at.column, FLOOD) + (1 - COL_FIRST) * prog(frame, at.step, RISE);
          const colH = lerp(STUB, H, grow);
          rect = {x: lerp(W - COL_W, PAD, p), y: lerp(0, y, p), w: lerp(COL_W, CW, p), h: lerp(colH, cardH, p), r: lerp(0, 24, p)};
        } else {
          const dir = i % 2 ? 1 : -1;
          // Before its start the slab waits offscreen, so every item keeps its parts mounted.
          rect = {x: PAD + dir * W * (1 - p), y, w: CW, h: cardH, r: 24};
        }
        const text = b.list[i] ?? '';
        const size = fitWords(text, itemMaxSize, TEXT_W, 2, 800, SANS_FONT, 40);
        // The number and every word finish rising on the accent, the beat the pluck plays.
        const nw = wordsOf(text).length;
        const textAt = t.accentFrame - RISE - Math.max(0, nw - 1);
        const tn = prog(frame, t.accentFrame - RISE, RISE);
        const span = Math.max(1, listEnd - t.accentFrame);
        const el = frame - t.accentFrame;
        const k = Math.floor(el / B);
        const fill = el < 0 ? 0 : Math.min(1, (k * B + B * prog(el - k * B, 0, RISE)) / span);
        return (
          // The first slab is the title's column, so it exists before its item: a deliberate intro moment.
          <div key={i} data-list-part="row" data-list-item={i} data-list-group={i === 0 ? 'scaffold' : undefined}
            style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, background: pal.bg, overflow: 'hidden',
            border: pal.edge ? `2px solid ${pal.edge}` : undefined, boxSizing: 'border-box'}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: cardH, display: 'flex', alignItems: 'center', gap: GAP, padding: `0 ${CARD_PAD}px`, boxSizing: 'border-box'}}>
              <div style={{width: NUM_W, height: 72, overflow: 'hidden', flexShrink: 0, fontFamily: MONO_FONT, fontSize: 64, fontWeight: 700, lineHeight: '72px', color: pal.num}}>
                <div data-list-part="number" data-list-item={i} data-list-align="y" style={{transform: `translateY(${(1 - tn) * 105}%)`}}>{String(i + 1).padStart(2, '0')}</div>
              </div>
              <Words role="list" item={i} text={text} at={textAt} stagger={1} size={size} weight={800} color={pal.ink} width={TEXT_W} style={{letterSpacing: '-0.01em'}} />
            </div>
            <div data-list-part="progress" data-list-item={i} style={{position: 'absolute', left: CARD_PAD, width: CW - CARD_PAD * 2, top: cardH - 30, height: 6, background: `${pal.rule}2e`,
              visibility: el >= 0 ? 'visible' : 'hidden'}}>
              <div style={{width: `${fill * 100}%`, height: '100%', background: pal.rule}} />
            </div>
          </div>
        );
      })}

      {!covered && (
        <div style={{position: 'absolute', left: PAD, top: headY, transformOrigin: '0 0', transform: `scale(${headScale})`}}>
          <Words role="headline" text={texts.headline} at={at.headline} stagger={headStagger} size={headSize} weight={850} color={theme.foreground}
            lastColor={frame >= at.step ? theme.accent : undefined} width={HW} lh={HEAD_LH} style={{letterSpacing: '-0.02em'}} />
        </div>
      )}

      {frame < at.lockBrand && (
        <div style={{position: 'absolute', left: PAD, top: PAD, height: PILL_H, padding: '0 30px', boxSizing: 'border-box', border: `2px solid ${theme.foreground}`,
          borderRadius: 999, display: 'flex', alignItems: 'center', clipPath: `inset(0 ${(1 - pillIn) * 100}% 0 0 round 999px)`}}>
          <Words role="brand" text={texts.brand} at={at.brand} stagger={2} size={pillSize} weight={700} color={theme.foreground} lh={1.2}
            style={{textTransform: 'uppercase', letterSpacing: '0.14em'}} />
        </div>
      )}

      {frame >= at.flood && (
        <AbsoluteFill style={{background: theme.foreground, clipPath: `circle(${Math.max(0, radius)}px at ${cx}px ${cy}px)`}}>
          {frame >= at.lockBrand && (
            <div style={{position: 'absolute', left: PAD, top: lockTop, width: CW}}>
              <Words role="brand" text={texts.brand} at={at.lockBrand} stagger={wordsOf(texts.brand).length > 2 ? 2 : 4} size={brandSize} weight={850}
                color={theme.background} width={CW} align="center" lh={1.06} style={{letterSpacing: '-0.02em'}} />
            </div>
          )}
          {frame >= at.cta && (
            <div style={{position: 'absolute', left: 0, right: 0, top: lockTop + brandH + 80, display: 'flex', justifyContent: 'center'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 20, height: pillBoxH, padding: '0 56px', boxSizing: 'border-box', borderRadius: 999,
                background: theme.accent, color: theme.background, transform: `scale(${lerp(1.3, 1, stamp)})`}}>
                <Words role="cta" text={texts.cta} at={at.cta} stagger={2} size={ctaSize} weight={800} color={theme.background} lh={1.15} />
                <div style={{height: ctaH, overflow: 'hidden', display: 'flex', alignItems: 'center'}}>
                  <div style={{display: 'flex', transform: `translate(${nudge}px, ${(1 - arrowIn) * 105}%)`}}><ArrowIcon size={Math.round(ctaSize * 0.93)} /></div>
                </div>
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {closing && (
        <div style={{position: 'absolute', left: W - COL_W, top: 0, width: COL_W, height: stubBack, background: theme.accent2}} />
      )}
    </AbsoluteFill>
  );
};
