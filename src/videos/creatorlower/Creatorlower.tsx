import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, easeOut, fit, Grain, Vignette} from '../shared/motion';
import {loadTemplateFonts, DISPLAY, MONO_FONT, SANS_FONT} from '../shared/fonts';
import {creatorlowerMeta} from './meta';
import type {CreatorlowerProps} from './schema';

loadTemplateFonts();

// Storyboard (120 BPM, beat = 15f):
// 0-20    grid + reticles settle in upper 2/3; carrier is a dot at (120, 706).
// 4-22    carrier draws up into the vertical name bar (x 120, y 706-874).
// 14-28   brand pill (x 150, y 706, max 18ch) wipes out of the bar.
// 20-38   headline (x 150, y 764, box 940w, max 24ch) rises out of a clip mask.
// 88-106  bar stretches to y 952; subhead strap (x 150, y 886, 1060w, max 52ch) unfolds.
// 154-166 bar kicks an accent2 rail along y 876 to x 1150.
// 162-178 cta badge (x 1150, y 790, 420w, max 20ch) locks onto the rail end.
// 178-240 hold: bar pulses on every beat, sheen scans down, badge dot pings.
const [S1, S2, S3] = creatorlowerMeta.scenes;
const X = 120;
const TOP = 706;
const BEAT = 15;
const RAIL_Y = TOP + 170;
const BADGE_X = 1150;
const T = {
  bar: S1.from + 4,
  brand: S1.from + 14,
  head: S1.from + 20,
  strap: S2.from + 8,
  sub: S2.from + 14,
  line: S3.from + 4,
  badge: S3.from + 12,
};

type Rect = {x: number; y: number; w: number; h: number};
const FOCUS: Rect[] = [
  {x: X - 10, y: TOP - 10, w: 1000, h: 170},
  {x: X + 20, y: TOP + 172, w: 1080, h: 82},
  {x: BADGE_X - 6, y: RAIL_Y - 92, w: 432, h: 98},
];

const Corner: React.FC<{x: number; y: number; dx: number; dy: number; len: number; color: string; weight?: number}> = ({
  x, y, dx, dy, len, color, weight = 2,
}) => {
  const b = `${weight}px solid ${color}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: dx > 0 ? x : x - len,
        top: dy > 0 ? y : y - len,
        width: len,
        height: len,
        borderLeft: dx > 0 ? b : undefined,
        borderRight: dx < 0 ? b : undefined,
        borderTop: dy > 0 ? b : undefined,
        borderBottom: dy < 0 ? b : undefined,
      }}
    />
  );
};

// Focus brackets snap around whatever each scene introduces, then release.
const Brackets: React.FC<Rect & {delay: number; color: string}> = ({x, y, w, h, delay, color}) => {
  const f = useCurrentFrame() - delay;
  const inP = interpolate(f, [0, 14], [0, 1], {...clamp, easing: easeOut});
  const out = interpolate(f, [30, 44], [1, 0], clamp);
  const pad = 14 + (1 - inP) * 36;
  const opacity = Math.min(inP, out);
  return (
    <AbsoluteFill style={{opacity}}>
      <Corner x={x - pad} y={y - pad} dx={1} dy={1} len={20} color={color} />
      <Corner x={x + w + pad} y={y - pad} dx={-1} dy={1} len={20} color={color} />
      <Corner x={x - pad} y={y + h + pad} dx={1} dy={-1} len={20} color={color} />
      <Corner x={x + w + pad} y={y + h + pad} dx={-1} dy={-1} len={20} color={color} />
    </AbsoluteFill>
  );
};

export const Creatorlower: React.FC<CreatorlowerProps> = ({texts, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {background: bg, surface, foreground: fg, accent, accent2} = theme;
  const p = (start: number, len: number, ease = easeOut) =>
    interpolate(frame, [start, start + len], [0, 1], {...clamp, easing: ease});

  const gridIn = p(0, 20);
  const retLen = 10 + p(2, 18) * 26;
  const barIn = p(T.bar, 18);
  const barExt = p(T.strap, 18, easeInOut);
  const barH = 8 + barIn * 160 + barExt * 78;
  const drawn = frame >= T.bar + 18;
  const kick = drawn ? Math.pow(1 - (frame % BEAT) / BEAT, 3) : 0;
  const sheen = drawn ? ((frame - T.bar - 18) % 30) / 30 : -1;
  const brandP = p(T.brand, 14);
  const headP = p(T.head, 18);
  const strapP = p(T.strap, 18, easeInOut);
  const subP = p(T.sub, 16);
  const lineP = p(T.line, 12, easeInOut);
  const lock = spring({frame: frame - T.badge, fps, config: {damping: 14, stiffness: 180, mass: 0.6}});
  const badgeOp = interpolate(frame, [T.badge, T.badge + 6], [0, 1], clamp);
  const badgeClip = p(T.badge, 12, easeInOut);
  const ping = frame >= T.badge + 16 ? ((frame - T.badge - 16) % 30) / 30 : 0;

  const brandSize = fit(texts.brand, 24, 300, 0.72);
  const headSize = fit(texts.headline, 92, 940, 0.56);
  const subSize = fit(texts.subhead, 34, 1000, 0.5);
  const ctaSize = fit(texts.cta, 34, 330, 0.6);

  return (
    <AbsoluteFill style={{background: bg, overflow: 'hidden'}}>
      {/* Studio framing grid, upper two-thirds only */}
      <AbsoluteFill
        style={{
          height: 700,
          opacity: gridIn,
          backgroundImage: `linear-gradient(${fg}0f 1px, transparent 1px), linear-gradient(90deg, ${fg}0f 1px, transparent 1px)`,
          backgroundSize: '120px 120px',
          backgroundPosition: `${frame * 0.25}px ${frame * 0.12}px`,
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
      />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, ${surface}aa 0%, transparent 60%)`}} />
      <AbsoluteFill style={{opacity: gridIn * 0.8}}>
        <Corner x={96} y={80} dx={1} dy={1} len={retLen} color={`${fg}55`} />
        <Corner x={1824} y={80} dx={-1} dy={1} len={retLen} color={`${fg}55`} />
        <Corner x={96} y={640} dx={1} dy={-1} len={retLen} color={`${fg}55`} />
        <Corner x={1824} y={640} dx={-1} dy={-1} len={retLen} color={`${fg}55`} />
        <div style={{position: 'absolute', left: 960 - retLen / 2, top: 360, width: retLen, height: 2, background: `${accent}66`}} />
        <div style={{position: 'absolute', left: 959, top: 361 - retLen / 2, width: 2, height: retLen, background: `${accent}66`}} />
      </AbsoluteFill>
      <AbsoluteFill style={{top: 620, background: `linear-gradient(to top, ${bg}ee, ${bg}00)`}} />

      {/* Carrier: the accent bar */}
      <div
        style={{
          position: 'absolute',
          left: X - kick * 2,
          top: TOP,
          width: 8 + kick * 4,
          height: barH,
          background: accent,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: `0 0 ${18 + kick * 18}px ${accent}66`,
        }}
      >
        {sheen >= 0 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: `${sheen * 120 - 20}%`, height: '20%', background: `${fg}aa`}} />
        )}
      </div>

      {/* Brand pill wipes out of the bar */}
      <div style={{position: 'absolute', left: X + 30, top: TOP, height: 46, overflow: 'hidden'}}>
        <div
          data-text-role="brand"
          style={{
            transform: `translateX(${(1 - brandP) * -105}%)`,
            height: 46,
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            background: accent,
            color: bg,
            borderRadius: 8,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: brandSize,
            letterSpacing: '0.14em',
            whiteSpace: 'nowrap',
          }}
        >
          {texts.brand}
        </div>
      </div>

      {/* Headline rises out of a clip mask */}
      <div style={{position: 'absolute', left: X + 30, top: TOP + 54, width: 940, height: 112, overflow: 'hidden'}}>
        <div
          data-text-role="headline"
          style={{
            position: 'absolute',
            bottom: 0,
            transform: `translateY(${(1 - headP) * 110}%)`,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: headSize,
            lineHeight: 1.15,
            color: fg,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {texts.headline}
        </div>
      </div>

      {/* Subhead strap unfolds beneath the name */}
      <div
        style={{
          position: 'absolute',
          left: X + 30,
          top: TOP + 180,
          height: 64,
          maxWidth: 1060,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          background: surface,
          borderLeft: `3px solid ${accent2}`,
          overflow: 'hidden',
          clipPath: `inset(0 ${(1 - strapP) * 100}% 0 0)`,
          transform: `scaleY(${0.3 + strapP * 0.7})`,
          transformOrigin: '0% 0%',
        }}
      >
        <div
          data-text-role="subhead"
          style={{
            transform: `translateY(${(1 - subP) * 40}px)`,
            fontFamily: SANS_FONT,
            fontWeight: 500,
            fontSize: subSize,
            color: fg,
            whiteSpace: 'nowrap',
          }}
        >
          {texts.subhead}
        </div>
      </div>

      {/* Rail kicked out of the bar toward the badge */}
      <div
        style={{
          position: 'absolute',
          left: X + 8,
          top: RAIL_Y - 2,
          width: BADGE_X - X - 8,
          height: 3,
          background: accent2,
          transform: `scaleX(${lineP})`,
          transformOrigin: '0% 50%',
        }}
      />

      {/* CTA badge locks onto the rail end */}
      <div
        style={{
          position: 'absolute',
          left: BADGE_X,
          top: RAIL_Y - 86,
          height: 86,
          maxWidth: 420,
          padding: '0 26px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: surface,
          border: `2px solid ${accent2}`,
          borderBottom: `4px solid ${accent2}`,
          borderRadius: 12,
          opacity: badgeOp,
          clipPath: `inset(0 ${(1 - badgeClip) * 100}% 0 0 round 12px)`,
          transform: `scale(${interpolate(lock, [0, 1], [1.18, 1])})`,
          transformOrigin: '0% 100%',
        }}
      >
        <div style={{position: 'relative', width: 14, height: 14, flexShrink: 0}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 7, background: accent2}} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 7,
              border: `2px solid ${accent2}`,
              transform: `scale(${1 + ping * 1.8})`,
              opacity: 1 - ping,
            }}
          />
        </div>
        <div
          data-text-role="cta"
          style={{fontFamily: SANS_FONT, fontWeight: 700, fontSize: ctaSize, color: fg, whiteSpace: 'nowrap'}}
        >
          {texts.cta}
        </div>
      </div>

      {creatorlowerMeta.scenes.map((s, i) => (
        <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
          <Brackets {...FOCUS[i]} delay={[6, 10, 14][i]} color={i === 2 ? accent2 : `${accent}cc`} />
        </Sequence>
      ))}

      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
