import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Fit a single line of text into a width, capped at a max size.
export const fit = (text: string, max: number, width: number, ratio = 0.6) =>
  Math.min(max, width / (Math.max(text.length, 1) * ratio));

// Find the largest size where words wrap into the requested number of rows.
export function wrapFit(text: string, max: number, width: number, lines = 2, ratio = 0.56, min = 28) {
  const words = text.trim().split(/\s+/);
  for (let size = max; size > min; size -= 2) {
    const perLine = Math.max(1, Math.floor(width / (size * ratio)));
    if (words.some((word) => word.length > perLine)) continue;
    let rows = 1;
    let length = 0;
    for (const word of words) {
      if (length && length + 1 + word.length > perLine) {
        rows += 1;
        length = word.length;
      } else length += (length ? 1 : 0) + word.length;
    }
    if (rows <= lines) return size;
  }
  return min;
}

// iPhone/iPad Safari kills pages that use too much graphics memory. Live previews
// there skip full-frame filters and blend layers. Renders (headless Chrome) keep everything.
export const LITE =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// A small noise tile rasterized once; shifting it each frame reads as film grain
// without re-running a full-frame SVG filter (too heavy for mobile Safari).
const NOISE_TILE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>',
)}")`;

export const Grain: React.FC = () => {
  const step = useCurrentFrame() % 6;
  if (LITE) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: 0.1,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        backgroundImage: NOISE_TILE,
        backgroundSize: '240px 240px',
        backgroundPosition: `${(step * 97) % 240}px ${(step * 53) % 240}px`,
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
    }}
  />
);

export const KineticLine: React.FC<{
  text: string;
  size: number;
  color: string;
  delay?: number;
  stagger?: number;
}> = ({text, size, color, delay = 0, stagger = 1.6}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', fontSize: size, fontWeight: 850, lineHeight: 1.05, color, whiteSpace: 'pre', perspective: 900}}>
      {[...text].map((ch, i) => {
        const s = spring({frame: frame - delay - i * stagger, fps, config: {damping: 13, stiffness: 120, mass: 0.7}});
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transformOrigin: '50% 100%',
              transform: `translateY(${interpolate(s, [0, 1], [size * 0.8, 0])}px) rotateX(${interpolate(s, [0, 1], [-85, 0])}deg)`,
              filter: LITE || s > 0.98 ? undefined : `blur(${interpolate(s, [0, 1], [14, 0], clamp)}px)`,
              opacity: Math.min(1, s * 1.5),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const ArrowIcon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
