import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { palette } from './contract';

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, 359], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const lf1 = frame;
  const lf2 = frame - 90;
  const lf3 = frame - 180;
  const lf4 = frame - 270;
  const lf4c = Math.min(Math.max(lf4, 0), 30);

  // Phrase 1 calculations
  const p1Enter = spring({ frame: lf1, fps, config: { damping: 18, stiffness: 90, mass: 0.9 } });
  const p1EnterNoise = spring({ frame: lf1 - 6, fps, config: { damping: 16, stiffness: 80, mass: 0.9 } });
  const p1LessX = interpolate(p1Enter, [0, 1], [-140, 0]);
  const p1LessOpacity = interpolate(lf1, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1NoiseX = interpolate(p1EnterNoise, [0, 1], [80, 0]);
  const p1GlitchOpacity = interpolate(lf1, [2, 10, 18, 34], [0, 0.55, 0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1GlitchOffset = interpolate(lf1, [0, 30], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1Shake = Math.sin(lf1 * 3.1) * interpolate(lf1, [0, 32], [5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1LineWidth = interpolate(lf1, [26, 44], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1LineOpacity = interpolate(lf1, [44, 60], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1ExitOpacity = interpolate(lf1, [70, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1Bar1W = interpolate(lf1, [8, 28], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1Bar2W = interpolate(lf1, [12, 32], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1Bar3W = interpolate(lf1, [16, 36], [0, 70], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1BarsOpacity = interpolate(lf1, [0, 34], [0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p1DotOpacity = interpolate(lf1, [20, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phrase 2 calculations
  const p2S1 = spring({ frame: lf2, fps, config: { damping: 20, stiffness: 90, mass: 0.8 } });
  const p2S2 = spring({ frame: lf2 - 7, fps, config: { damping: 20, stiffness: 90, mass: 0.8 } });
  const p2MoreY = interpolate(p2S1, [0, 1], [50, 0]);
  const p2MoreOpacity = interpolate(lf2, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2FocusY = interpolate(p2S2, [0, 1], [50, 0]);
  const p2FocusOpacity = interpolate(lf2, [7, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2MoreScale = interpolate(p2S1, [0, 1], [1.06, 1]);
  const p2FocusScale = interpolate(p2S2, [0, 1], [1.06, 1]);
  const p2LetterSpacing = interpolate(p2S1, [0, 1], [0.14, -0.03]);
  const p2RingScale = interpolate(lf2, [0, 32], [1.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2RingOpacity = interpolate(lf2, [0, 10, 30], [0, 0.45, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2Ring2Opacity = interpolate(lf2, [4, 16, 28], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2Ring2Scale = interpolate(lf2, [0, 28], [1.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2Blur = interpolate(lf2, [0, 18], [2, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2Exit = interpolate(lf2, [70, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2DotScale = interpolate(lf2, [18, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p2LineScale = interpolate(lf2, [16, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phrase 3 calculations
  const p3S1 = spring({ frame: lf3, fps, config: { damping: 18, stiffness: 90 } });
  const p3S2 = spring({ frame: lf3 - 6, fps, config: { damping: 18, stiffness: 90 } });
  const p3S3 = spring({ frame: lf3 - 12, fps, config: { damping: 18, stiffness: 90 } });
  const p3BetterY = interpolate(p3S1, [0, 1], [-90, 0]);
  const p3WorkX = interpolate(p3S2, [0, 1], [-180, 0]);
  const p3TogetherY = interpolate(p3S3, [0, 1], [90, 0]);
  const p3BetterOpacity = interpolate(lf3, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3WorkOpacity = interpolate(lf3, [6, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3TogetherOpacity = interpolate(lf3, [12, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3UnderlineW = interpolate(lf3, [30, 54], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3UnderlineOpacity = interpolate(lf3, [30, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3DotScale = interpolate(lf3, [18, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3GhostX = interpolate(lf3, [0, 50], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3Exit = interpolate(lf3, [70, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p3BottomLinesOpacity = interpolate(lf3, [40, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phrase 4 calculations
  const p4SLine = spring({ frame: lf4c, fps, config: { damping: 20, stiffness: 110 } });
  const p4SMake = spring({ frame: lf4c, fps, config: { damping: 18, stiffness: 90 } });
  const p4SFor = spring({ frame: lf4c - 4, fps, config: { damping: 18, stiffness: 90 } });
  const p4SRelay = spring({ frame: lf4c - 11, fps, config: { damping: 16, stiffness: 100 } });
  const p4LineScale = interpolate(p4SLine, [0, 1], [0, 1]);
  const p4MakeY = interpolate(p4SMake, [0, 1], [70, 0]);
  const p4MakeOpacity = interpolate(lf4c, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p4ForY = interpolate(p4SFor, [0, 1], [70, 0]);
  const p4ForOpacity = interpolate(lf4c, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p4RelayY = interpolate(p4SRelay, [0, 1], [24, 0]);
  const p4RelayOpacity = interpolate(lf4c, [11, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p4RelayScale = interpolate(p4SRelay, [0, 1], [0.92, 1]);
  const p4DotsOpacity = interpolate(lf4c, [18, 26], [0, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: palette.background, fontFamily: 'Archivo', overflow: 'hidden' }}>
      {/* subtle grid */}
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(to right, ${palette.muted}14 1px, transparent 1px), linear-gradient(to bottom, ${palette.muted}14 1px, transparent 1px)`,
          backgroundSize: '120px 120px',
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 120% 88% at 50% 50%, transparent 62%, rgba(0,0,0,0.42) 100%)`,
          opacity: 0.9,
        }}
      />
      {/* corner brackets - safe margin 80px */}
      <div style={{ position: 'absolute', left: 80, top: 80, width: 28, height: 28, borderTop: `1px solid ${palette.muted}`, borderLeft: `1px solid ${palette.muted}`, opacity: 0.45 }} />
      <div style={{ position: 'absolute', right: 80, top: 80, width: 28, height: 28, borderTop: `1px solid ${palette.muted}`, borderRight: `1px solid ${palette.muted}`, opacity: 0.45 }} />
      <div style={{ position: 'absolute', left: 80, bottom: 80, width: 28, height: 28, borderBottom: `1px solid ${palette.muted}`, borderLeft: `1px solid ${palette.muted}`, opacity: 0.45 }} />
      <div style={{ position: 'absolute', right: 80, bottom: 80, width: 28, height: 28, borderBottom: `1px solid ${palette.muted}`, borderRight: `1px solid ${palette.muted}`, opacity: 0.45 }} />

      {/* center accent dot */}
      <div style={{ position: 'absolute', left: '50%', top: 82, width: 5, height: 5, background: palette.accent, borderRadius: '50%', transform: 'translateX(-50%)', opacity: 0.9 }} />

      {/* progress bar */}
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 48, height: 2, background: 'rgba(177,180,188,0.16)', overflow: 'hidden' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: palette.accent }} />
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 52, height: 1, background: 'rgba(177,180,188,0.06)' }} />

      {/* Phrase 1: Less noise. 0-90 */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
          <div style={{ opacity: p1ExitOpacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, position: 'relative' }}>
            {/* noise bars behind text */}
            <div style={{ position: 'absolute', top: '42%', left: -40, right: -40, display: 'flex', flexDirection: 'column', gap: 10, opacity: p1BarsOpacity }}>
              <div style={{ height: 1, background: palette.muted, width: `${p1Bar1W}%`, opacity: 0.6 }} />
              <div style={{ height: 1, background: palette.secondary, width: `${p1Bar2W}%`, opacity: 0.5, marginLeft: '12%' }} />
              <div style={{ height: 1, background: palette.accent, width: `${p1Bar3W}%`, opacity: 0.45, marginLeft: '28%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.18em', alignItems: 'baseline', position: 'relative' }}>
              <span
                style={{
                  fontSize: 184,
                  fontWeight: 800,
                  letterSpacing: '-0.05em',
                  lineHeight: 1,
                  color: palette.foreground,
                  display: 'inline-block',
                  transform: `translateX(${p1LessX}px)`,
                  opacity: p1LessOpacity,
                }}
              >
                Less
              </span>
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontSize: 184,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  letterSpacing: '-0.05em',
                  lineHeight: 1,
                  color: palette.foreground,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: palette.secondary,
                    opacity: p1GlitchOpacity,
                    transform: `translateX(${p1GlitchOffset + p1Shake}px) translateY(${p1Shake * 0.5}px)`,
                    filter: 'blur(0.6px)',
                  }}
                >
                  noise.
                </span>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: palette.accent,
                    opacity: p1GlitchOpacity * 0.6,
                    transform: `translateX(${-p1GlitchOffset - p1Shake}px) translateY(${-p1Shake * 0.4}px)`,
                    filter: 'blur(0.7px)',
                  }}
                >
                  noise.
                </span>
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    transform: `translateX(${p1NoiseX * 0.15 + p1Shake * 0.6}px)`,
                  }}
                >
                  noise.
                </span>
                <span
                  style={{
                    position: 'absolute',
                    left: '-2%',
                    right: '-2%',
                    top: '54%',
                    height: 3,
                    background: palette.accent,
                    transformOrigin: 'left',
                    transform: `scaleX(${p1LineWidth / 100})`,
                    opacity: p1LineOpacity,
                    borderRadius: 2,
                  }}
                />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, opacity: p1DotOpacity }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: palette.accent }} />
              <div style={{ width: 34, height: 1, background: 'rgba(245,245,242,0.35)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(245,245,242,0.18)', border: `1px solid ${palette.muted}` }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phrase 2: More focus. 90-180 */}
      <Sequence from={90} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: p2Exit }}>
            <div
              style={{
                position: 'absolute',
                width: 860,
                height: 860,
                borderRadius: '50%',
                border: `1px solid ${palette.muted}`,
                opacity: p2RingOpacity,
                transform: `translate(-50%, -50%) scale(${p2RingScale})`,
                left: '50%',
                top: '50%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 520,
                height: 520,
                borderRadius: '50%',
                border: `1px solid ${palette.secondary}`,
                opacity: p2Ring2Opacity,
                transform: `translate(-50%, -50%) scale(${p2Ring2Scale})`,
                left: '50%',
                top: '50%',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: '0.18em',
                alignItems: 'baseline',
                filter: `blur(${p2Blur}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 186,
                  fontWeight: 800,
                  letterSpacing: `${p2LetterSpacing}em`,
                  lineHeight: 1,
                  color: palette.foreground,
                  display: 'inline-block',
                  transform: `translateY(${p2MoreY}px) scale(${p2MoreScale})`,
                  opacity: p2MoreOpacity,
                }}
              >
                More
              </span>
              <span
                style={{
                  fontSize: 186,
                  fontWeight: 200,
                  fontStyle: 'italic',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  color: palette.foreground,
                  display: 'inline-block',
                  transform: `translateY(${p2FocusY}px) scale(${p2FocusScale})`,
                  opacity: p2FocusOpacity,
                }}
              >
                focus.
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{ width: 48, height: 2, background: palette.accent, borderRadius: 2, transform: `scaleX(${p2DotScale})`, opacity: p2DotScale }} />
              <div style={{ width: 220, height: 1, background: 'rgba(177,180,188,0.22)', transform: `scaleX(${p2LineScale})`, opacity: p2LineScale }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phrase 3: Better work, together. 180-270 */}
      <Sequence from={180} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
          <div style={{ opacity: p3Exit, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: -42,
                fontSize: 220,
                fontWeight: 800,
                letterSpacing: '-0.06em',
                color: palette.foreground,
                opacity: 0.03,
                lineHeight: 1,
                pointerEvents: 'none',
                transform: `translateX(${p3GhostX}px)`,
              }}
            >
              Better
            </div>
            <div style={{ display: 'flex', gap: '0.28em', alignItems: 'baseline', fontSize: 142, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.045em' }}>
              <span style={{ color: palette.foreground, display: 'inline-block', transform: `translateY(${p3BetterY}px)`, opacity: p3BetterOpacity }}>Better</span>
              <span
                style={{
                  color: palette.foreground,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  display: 'inline-block',
                  transform: `translateX(${p3WorkX}px)`,
                  opacity: p3WorkOpacity,
                }}
              >
                work,
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span
                style={{
                  fontSize: 142,
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                  color: palette.accent,
                  display: 'inline-block',
                  transform: `translateY(${p3TogetherY}px)`,
                  opacity: p3TogetherOpacity,
                }}
              >
                together.
              </span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: palette.accent, opacity: p3TogetherOpacity, transform: `scale(${p3DotScale})` }} />
            </div>
            <div style={{ position: 'relative', height: 2, width: 620, marginTop: 14, background: 'rgba(177,180,188,0.2)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p3UnderlineW}%`, background: palette.foreground, opacity: p3UnderlineOpacity }} />
              <div
                style={{
                  position: 'absolute',
                  left: `${p3UnderlineW}%`,
                  top: '50%',
                  width: 8,
                  height: 8,
                  background: palette.accent,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: p3UnderlineOpacity,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, opacity: p3BottomLinesOpacity }}>
              <div style={{ width: 84, height: 1, background: palette.muted, opacity: 0.35 }} />
              <div style={{ width: 84, height: 1, background: palette.muted, opacity: 0.18 }} />
              <div style={{ width: 84, height: 1, background: palette.muted, opacity: 0.35 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phrase 4: Make room for what matters. + Relay 270-360 */}
      <Sequence from={270} durationInFrames={90}>
        <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: 1760 }}>
            <div style={{ width: 720, height: 1, background: palette.muted, opacity: 0.35, transform: `scaleX(${p4LineScale})`, transformOrigin: 'center' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 0.92, gap: 4 }}>
              <div style={{ overflow: 'hidden', padding: '0 12px' }}>
                <div
                  style={{
                    fontSize: 152,
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    color: palette.foreground,
                    transform: `translateY(${p4MakeY}px)`,
                    opacity: p4MakeOpacity,
                    lineHeight: 1,
                  }}
                >
                  Make room
                </div>
              </div>
              <div style={{ overflow: 'hidden', padding: '0 12px' }}>
                <div
                  style={{
                    fontSize: 92,
                    fontWeight: 300,
                    fontStyle: 'italic',
                    letterSpacing: '-0.04em',
                    color: palette.foreground,
                    transform: `translateY(${p4ForY}px)`,
                    opacity: p4ForOpacity,
                    lineHeight: 1,
                  }}
                >
                  for what matters.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, opacity: p4RelayOpacity, transform: `translateY(${p4RelayY}px) scale(${p4RelayScale})` }}>
              <div style={{ width: 38, height: 1, background: 'rgba(177,180,188,0.35)' }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 18px',
                  border: `1px solid rgba(177,180,188,0.22)`,
                  borderRadius: 999,
                  background: 'rgba(245,245,242,0.04)',
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.accent, boxShadow: `0 0 10px ${palette.accent}88` }} />
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.foreground, lineHeight: 1 }}>Relay</span>
              </div>
              <div style={{ width: 38, height: 1, background: 'rgba(177,180,188,0.35)' }} />
            </div>
            <div style={{ width: 720, height: 1, background: palette.muted, opacity: 0.35, transform: `scaleX(${p4LineScale})`, transformOrigin: 'center', marginTop: 4 }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 2, opacity: p4DotsOpacity }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: palette.accent }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: palette.muted, opacity: 0.5 }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: palette.muted, opacity: 0.3 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
