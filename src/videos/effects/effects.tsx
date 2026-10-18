// Blur is banned in direction-scanned templates except in these two effects. Templates use these helpers
// and never write blur() themselves, so the exception cannot spread to other motion.
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {clamp, easeInOut, LITE} from '../shared/motion';

const MAX_WHIP_BLUR = 28;

/**
 * Whip pan between two scene layers. `progress` runs 0 to 1. Blur peaks mid-move and is zero
 * at both ends, so neither scene stays blurred.
 */
export const WhipPan: React.FC<{
  progress: number;
  from: React.ReactNode;
  to: React.ReactNode;
  direction?: 1 | -1;
  width: number;
}> = ({progress, from, to, direction = 1, width}) => {
  const t = interpolate(progress, [0, 1], [0, 1], {...clamp, easing: easeInOut});
  const amount = Math.sin(t * Math.PI) * MAX_WHIP_BLUR;
  const filter = LITE || amount < 0.5 ? undefined : `blur(${amount.toFixed(1)}px)`;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translateX(${-direction * t * width}px)`, filter}}>{from}</AbsoluteFill>
      <AbsoluteFill style={{transform: `translateX(${direction * (1 - t) * width}px)`, filter}}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Glass caption surface. Blur stays behind the caption. Mobile Safari previews get an opaque fallback. */
export const GlassCaption: React.FC<{
  children: React.ReactNode;
  tint: string;
  border: string;
  style?: React.CSSProperties;
}> = ({children, tint, border, style}) => (
  <div
    data-effect="glass-caption"
    style={{
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: LITE ? tint : `${tint}ad`,
      backdropFilter: LITE ? undefined : 'blur(18px) saturate(1.3)',
      WebkitBackdropFilter: LITE ? undefined : 'blur(18px) saturate(1.3)',
      ...style,
    }}
  >
    {children}
  </div>
);
